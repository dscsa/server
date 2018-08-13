"use strict"
//defaults
module.exports = exports = Object.create(require('../helpers/model'))

let csv = require('csv/server')
let admin = {ajax:{auth:require('../../../keys/dev')}}

exports.views = {
  //Use _bulk_get here instead? Not supported in 1.6
  //ctx.db.account.get({_id:{$gt:null, $in:accounts[0].authorized}}),
  authorized(doc) {
    for (var i in doc.authorized) {
      emit(doc.authorized[i])
    }
  },

  state(doc) {
    emit(doc.state)
  }
}

exports.get_csv = async function (ctx, db) {
  let view = await ctx.db.account.allDocs({endkey:'_design', include_docs:true})
  ctx.body = csv.fromJSON(view.rows)
  ctx.type = 'text/csv'
}

//This is to find the emptiest bins
exports.binned = async function  (ctx, id) { //account._id will not be set because google does not send cookie
  const view = await ctx.db.transaction.query('inventory-by-bin-verifiedat', {group_level:3, startkey:[id, 'binned'], endkey:[id, 'binned', {}]}) //exclude repack bins from empty bins
  let sortAsc = view.rows.sort((a, b) => a.value.count - b.value.count)
  ctx.body  = csv.fromJSON(sortAsc, ctx.query.fields && ctx.query.fields.split(','))
}

//Shows everything in inventory AND all ordered items not in inventory
exports.inventory = async function(ctx, to_id) { //account._id will not be set because google does not send cookie


  let minExp   = new Date()
  let minMonth = minExp.getMonth() + (+ctx.query.buffer || 0) // TODO exlcudes expireds in the last month because they are set to the 1st of the month
  console.log('inventory.csv', minExp.getMonth(), +ctx.query.buffer || 0,  minMonth, ctx.query)
  minExp.setMonth(minMonth) //internal search does 1 month, so let's pad it by an additional month
  let [year, month] = minExp.toJSON().split('-')

  let opts = {
    group_level:7, //by drug.generic, drug.gsns, drug.brand,
    startkey:[to_id, 'month', year, month],
    endkey:[to_id, 'month', year, month+'\uffff']
  }

  console.log('inventory.qty-by-generic', opts)

  const [inventory, account] = await Promise.all([
    ctx.db.transaction.query('inventory.qty-by-generic', opts),
    ctx.db.account.get(to_id)
  ])

  //Match inventory with ordered when applicable
  let rows = inventory.rows.map(row => {

    //console.log('inventory.qty-by-generic', row.key)
    let generic = row.key[opts.startkey.length]

    row.key = row.key.slice(1)
    row.value.qty = row.value.sum
    delete row.value.sum
    delete row.value.max
    delete row.value.min
    delete row.value.sumsqr

    if (account.ordered[generic]) {
      row.value.ordered = true
      row.value.order = account.ordered[generic]
      delete account.ordered[generic]
    }

    return row
  })

  //Add unmatched orders to the end of array
  for (let generic in account.ordered)
    rows.push({key:[to_id, year, month, generic], value:{ordered:true, order:account.ordered[generic]}})

  ctx.body = csv.fromJSON(rows, ctx.query.fields && ctx.query.fields.split(','))
}

exports.recordByGeneric = async function  (ctx, to_id) { //account._id will not be set because google does not send cookie
  let [qtyRecords, valueRecords] = await Promise.all([
    getRecords(ctx, to_id, 'qty-by-generic-ndc'),
    getRecords(ctx, to_id, 'value-by-generic-ndc')
  ])

  let records = {}
  mergeRecords(qtyRecords, 'count', records)
  mergeRecords(qtyRecords, 'qty', records)
  mergeRecords(valueRecords, 'value', records)

  records = sortRecords(records)

  ctx.body = csv.fromJSON(records, ctx.query.fields && ctx.query.fields.split(','))
}

exports.recordByUser = async function  (ctx, to_id) { //account._id will not be set because google does not send cookie

  let qtyRecords = await getRecords(ctx, to_id, 'qty-by-user-from-shipment')

  let records = {}
  mergeRecords(qtyRecords, 'count', records)
  mergeRecords(qtyRecords, 'qty', records)
  records = sortRecords(records)

  ctx.body = csv.fromJSON(records, ctx.query.fields && ctx.query.fields.split(','))
}

exports.recordByFrom = async function (ctx, to_id) { //account._id will not be set because google does not send cookie

  let [qtyRecords, valueRecords] = await Promise.all([
    getRecords(ctx, to_id, 'qty-by-from-generic-ndc'),
    getRecords(ctx, to_id, 'value-by-from-generic-ndc')
  ])

  let records = {}
  mergeRecords(qtyRecords, 'count', records)
  mergeRecords(qtyRecords, 'qty', records)
  mergeRecords(valueRecords, 'value', records)

  records = sortRecords(records)

  ctx.body = csv.fromJSON(records, ctx.query.fields && ctx.query.fields.split(','))
}

async function getRecords(ctx, to_id, suffix) {
  //TODO Enable people to pick only certain fields so we don't need all these queries
  ///We can also reduce the lines of code by doing a for-loop accross the stages
  let group  = ctx.query.group || ''
  let opts   = {
    group_level:ctx.query.group_level ? +ctx.query.group_level + 2 : groupby(group).level, //default is by drug.generic.  Add 2 for to_id and year/month/day key
    startkey:[to_id, group].concat(ctx.query.startkey || []),
    endkey:[to_id, group].concat(ctx.query.endkey || [])
  }

  opts.endkey[opts.endkey.length] = {}

  let records = await Promise.all([
    ctx.db.transaction.query('received.'+suffix, opts),
    ctx.db.transaction.query('verified.'+suffix, opts),
    ctx.db.transaction.query('expired.'+suffix, opts),
    ctx.db.transaction.query('disposed.'+suffix, opts),
    ctx.db.transaction.query('dispensed.'+suffix, opts),
    ctx.db.transaction.query('pended.'+suffix, opts),
  ])
  return records
}

function mergeRecords(records, suffix, rows) {
  mergeRecord(rows, records[0], 'received.'+suffix)
  mergeRecord(rows, records[1], 'verified.'+suffix)
  mergeRecord(rows, records[2], 'expired.'+suffix)
  mergeRecord(rows, records[3], 'disposed.'+suffix)
  mergeRecord(rows, records[4], 'dispensed.'+suffix)
  mergeRecord(rows, records[5], 'pended.'+suffix)
}

//console.log('recordByGeneric opts, rows', opts, rows)
//(Re)sort them in ascending order.  And calculate inventory
function sortRecords(rows) {
  let last = { qty:0, value:0, count:0 } //since cumulative, must be done in ascending date order.
  return Object.keys(rows).sort().map(key => {
    let row = rows[key].value
    last.qty   = last.qty   + row['received.qty'] - row['expired.qty'] - row['disposed.qty'] - row['dispensed.qty'] - row['pended.qty']
    last.value = last.value + row['received.value'] - row['expired.value'] - row['disposed.value'] - row['dispensed.value'] - row['pended.value']
    //Can't calculate an inventory count like this because repacking can split/combine existing items, meaning that more can be dispensed/disposed/expired than what is received.  Would need to do with using the view
    //last.count = last.count + row['received.count'] - row['expired.count'] - row['disposed.count'] - row['dispensed.count'] - row['pended.count']
    //combining with last row (last.qty = row['inventory.qty'] = calculation) doubled the delta for some reason
    row['inventory.qty']   = +(last.qty).toFixed(2)
    row['inventory.value'] = +(last.value).toFixed(2)
    //row['inventory.count'] = +(last.count).toFixed(2)

    //Rather than maintaining a two separate views with refused.qty and refused.value it's easy here to split diposed into disposed.refused and disposed.verified
    row['refused.count'] = row['received.count'] - row['verified.count']
    row['refused.qty']   = row['received.qty']   - row['verified.qty']
    row['refused.value'] = +(row['received.value'] - row['verified.value']).toFixed(2)

    row['disposed.qty']   -= row['refused.qty']
    row['disposed.count'] -= row['refused.count']
    row['disposed.value'] -= row['refused.value']


    return rows[key]
  })
}

function mergeRecord(rows, record, field) {
  for (let row of record.rows) {
    let key = row.key.slice(1).join(',')
    rows[key] = rows[key] || {key:row.key.slice(1), value:{
       //specify csv column order here -- TODO default to user supplied ctx.query.fields
      'received.count':0,
      'verified.count':0,
      'refused.count':0,
      'expired.count':0,
      'disposed.count':0,
      'dispensed.count':0,
      'pended.count':0,
      'received.qty':0,
      'verified.qty':0,
      'refused.qty':0,
      'expired.qty':0,
      'disposed.qty':0,
      'dispensed.qty':0,
      'pended.qty':0,
      'inventory.qty':0,
      'received.value':0,
      'verified.value':0,
      'refused.value':0,
      'expired.value':0,
      'disposed.value':0,
      'dispensed.value':0,
      'pended.value':0,
      'inventory.value':0
    }}

    rows[key].value[field] = field.slice(-5) == 'count' ? row.value.count : +(row.value.sum).toFixed(2)
  }
}

function groupby(group) {
  return {
    ''    :{ level:3 },
    year  :{ level:4 },
    month :{ level:5 },
    day   :{ level:6 },
  }[group]
}

exports.validate = function(model) {
  return model
    .ensure('_id').custom(authorized).withMessage('You are not authorized to modify this account')
}

//Context-specific - options MUST have 'ctx' property in order to work.
function authorized(doc, opts) {

  if (opts.ctx.account._id)
    return doc._id == opts.ctx.account._id

  if (exports.isNew(doc, opts)) {
    console.log('account is new')
    return opts.ctx.ajax = admin.ajax, true //enable user to be created even though current user doesn't exist and therefor doesn't have allAccounts role
  }

  console.log('account is not authorized', doc._rev, opts)
  return false
}

exports.authorized = {
  async get(ctx) {
    //Search for all accounts (recipients) that have authorized this account as a sender
    //shortcut to /accounts?selector={"authorized":{"$elemMatch":"${session.account}"}}
    ctx.status = 501 //not implemented
  },

  async post(ctx) {
    //Authorize a sender
    console.log(ctx.account._id, ctx.req.body)
    let account = await ctx.db.account.get(ctx.account._id)
    console.log(account.authorized, account.authorized.indexOf(ctx.req.body))
    //allow body to be an array of ids to authorize
    let index = account.authorized.indexOf(ctx.req.body)

    if (index != -1) {
      ctx.status  = 409
      ctx.message = 'This account is already authorized'
    } else {
      account.authorized.push(ctx.req.body)
      ctx.body = await ctx.db.account.put(account, {ctx})
      ctx.body.authorized = account.authorized
    }
  },

  async delete(ctx) {
    //Unauthorize a sender
    let account = await ctx.db.account.get(ctx.account._id)

    //allow body to be an array of ids to unauthorize
    let index   = account.authorized.indexOf(ctx.req.body)

    if (index == -1) {
      ctx.status  = 409
      ctx.message = 'This account is already not authorized'
    } else {
      account.authorized.splice(index, 1)
      ctx.body = await ctx.db.account.put(account, {ctx})
      ctx.body.authorized = account.authorized
    }
  }
}

exports.pend = {

  async post(ctx, _id, name) {
    ctx.account = {_id}
    ctx.body = await updateNext(ctx, [{pending:{_id:name}, createdAt:new Date().toJSON()}])
  },

  async delete(ctx, _id, name) {
    ctx.account = {_id}
    ctx.body = await updateNext(ctx, [])
  }
}

exports.dispense = {

  async post(ctx, _id) {
    ctx.account = {_id}
    ctx.body = await updateNext(ctx, [{dispensed:{}, createdAt:new Date().toJSON()}])
  },

  // async delete(ctx, _id) {
  //   ctx.account = {_id}
  //   ctx.body = await patchNext(ctx, [])
  // }
}

exports.dispense = {

  async post(ctx, _id) {
    ctx.account = {_id}
    ctx.body = await updateNext(ctx, [{dispose:{}, createdAt:new Date().toJSON()}])
  },

  // async delete(ctx, _id) {
  //   ctx.account = {_id}
  //   ctx.body = await patchNext(ctx, [])
  // }
}

function updateNext(ctx, next) {
  for (let transaction of ctx.req.body) {
    transaction.next = next
  }
  return ctx.db.transaction.bulkDocs(ctx.req.body, {ctx})
}
