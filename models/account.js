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

function currentDate(months, split) {
  let minExp   = new Date()
  let minMonth = minExp.getMonth() + (+months || 0) // TODO exlcudes expireds in the last month because they are set to the 1st of the month
  minExp.setMonth(minMonth) //internal search does 1 month, so let's pad it by an additional month
  minExp = minExp.toJSON()
  return split ? minExp.split('-') : minExp
}

//Shows everything in inventory AND all ordered items not in inventory
exports.inventory = async function(ctx, to_id) { //account._id will not be set because google does not send cookie

  let [invYear, invMonth] = currentDate(ctx.query.inventory_months, true)

  let invOpts = {
    group_level:7, //by drug.generic, drug.gsns, drug.brand,
    startkey:[to_id, 'month', invYear, invMonth],
    endkey:[to_id, 'month', invYear, invMonth+'\uffff']
  }

  let [disYear, disMonth] = currentDate(ctx.query.dispensed_months, true)

  let disOpts = {
    group_level:7, //by drug.generic, drug.gsns, drug.brand,
    startkey:[to_id, 'month', disYear, disMonth],
    endkey:[to_id, 'month', disYear, {}]
  }

  console.log('inventory.csv', 'invOpts', invOpts, 'disOpts', disOpts)

  const [inventory, dispensed, account] = await Promise.all([
    ctx.db.transaction.query('inventory.qty-by-generic', invOpts),
    ctx.db.transaction.query('dispensed.qty-by-generic', disOpts),
    ctx.db.account.get(to_id)
  ])

  let drugs = {}, fieldOrder = {'inventory.qty':0, 'dispensed.qty':0}
  mergeRecord(drugs, inventory, 'inventory.qty', fieldOrder, genericKey)
  mergeRecord(drugs, dispensed, 'dispensed.qty', fieldOrder, genericKey)

  //Match inventory with ordered when applicable
  for (let i in drugs) {
    let generic = drugs[i].key[4]

    if (account.ordered[generic]) {
      drugs[i].value.ordered = true
      drugs[i].value.order = account.ordered[generic]
      delete account.ordered[generic]
    }
  }

  //Add unmatched orders to the end of array.  Match fields in the order they were emitted
  for (let generic in account.ordered)
    drugs[generic] = {key:[to_id, '', invYear, invMonth, generic], value:{ordered:true, order:account.ordered[generic]}}

  drugs = Object.keys(drugs).map(i => drugs[i])

  ctx.body = csv.fromJSON(drugs, ctx.query.fields)
}

function genericKey(key) {
  return key[5]
}

exports.recordByGeneric = async function  (ctx, to_id) { //account._id will not be set because google does not send cookie

  let [qtyRecords, valueRecords] = await Promise.all([
    getRecords(ctx, to_id, 'qty-by-generic'),
    getRecords(ctx, to_id, 'value-by-generic')
  ])

  let records = mergeRecords({qty:qtyRecords,count:qtyRecords, value:valueRecords})

  records = sortRecords(records)

  ctx.body = csv.fromJSON(records, ctx.query.fields)
}

exports.recordByFrom = async function (ctx, to_id) { //account._id will not be set because google does not send cookie

  let [qtyRecords, valueRecords] = await Promise.all([
    getRecords(ctx, to_id, 'qty-by-from-generic'),
    getRecords(ctx, to_id, 'value-by-from-generic')
  ])

  let records = mergeRecords({qty:qtyRecords,count:qtyRecords, value:valueRecords})

  records = sortRecords(records, to_id) //Exclude expired becuase it will be wrong since we every thing "from" the to_id is just a repack and nothing will be received making expired.count/qty/value all negative

  ctx.body = csv.fromJSON(records, ctx.query.fields)
}

exports.recordByUser = async function  (ctx, to_id) { //account._id will not be set because google does not send cookie
  let qtyRecords = await getRecords(ctx, to_id, 'qty-by-user-from-shipment')

  let records = mergeRecords({qty:qtyRecords,count:qtyRecords})

  records = sortRecords(records)

  ctx.body = csv.fromJSON(records, ctx.query.fields)
}

function startkey(key) {
  return JSON.parse(key || '[]')
}

function endkey(key) {
  return [...startkey(key), {}]
}

async function getRecords(ctx, to_id, suffix) {
  //TODO Enable people to pick only certain fields so we don't need all these queries
  ///We can also reduce the lines of code by doing a for-loop accross the stages
  let group  = ctx.query.group || ''
  let opts   = {
    group_level:group_level(group).groupByDate,
    startkey:[to_id, group].concat(startkey(ctx.query.startkey)),
    endkey:[to_id, group].concat(endkey(ctx.query.endkey))
  }

  ///Unlike the others inventory dates can be in the future (e.g, emitted every month until they expire).  We only want ones in
  //the past emit([to_id, 'month', year, month, doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, sortedDrug, doc.bin], val)
  let invDate = group ? [] : currentDate(1, true).slice(0, 2)
  let invOpts = {
    group_level:group_level(group).groupByInv,
    startkey:[to_id, group || 'month'].concat(invDate).concat(startkey(ctx.query.startkey)),
      endkey:[to_id, group || 'month'].concat(invDate).concat(endkey(ctx.query.endkey))
  }

  console.log('getRecords', 'received.'+suffix, 'opts', opts, 'invOpts', invOpts)

  let records = await Promise.all([
    ctx.db.transaction.query('received.'+suffix, opts),
    ctx.db.transaction.query('refused.'+suffix, opts),
    ctx.db.transaction.query('verified.'+suffix, opts),
    ctx.db.transaction.query('disposed.'+suffix, opts),
    ctx.db.transaction.query('dispensed.'+suffix, opts),
    ctx.db.transaction.query('pended.'+suffix, opts),
    ctx.db.transaction.query('inventory.'+suffix, invOpts).then(res => {
      group || res.rows.forEach(row => row.key[1] = '', row.key.splice(2, 2)) //remove year and month from keys if no grouping is specified
      return res
    })
  ])
  return records
}

//Something like {qty:records, count:records}
function mergeRecords(opts) {

  //specify csv column order here -- TODO default to user supplied ctx.query.fields
  let fieldOrder = Object.assign({},
    opts.count && {
      'received.count':0,
      'refused.count':0,
      'verified.count':0,
      'expired.count':0,
      'disposed.count':0,
      'dispensed.count':0,
      'pended.count':0,
      'inventory.count':0
    },
    opts.qty && {
      'received.qty':0,
      'refused.qty':0,
      'verified.qty':0,
      'expired.qty':0,
      'disposed.qty':0,
      'dispensed.qty':0,
      'pended.qty':0,
      'inventory.qty':0
    },
    opts.value && {
      'received.value':0,
      'refused.value':0,
      'verified.value':0,
      'expired.value':0,
      'disposed.value':0,
      'dispensed.value':0,
      'pended.value':0,
      'inventory.value':0
    }
  )

  let records = {}
  for (let suffix in opts) {
    mergeRecord(records, opts[suffix][0], 'received.'+suffix, fieldOrder, uniqueKey)
    mergeRecord(records, opts[suffix][1], 'refused.'+suffix, fieldOrder, uniqueKey)
    mergeRecord(records, opts[suffix][2], 'verified.'+suffix, fieldOrder, uniqueKey)
    mergeRecord(records, opts[suffix][3], 'disposed.'+suffix, fieldOrder, uniqueKey)
    mergeRecord(records, opts[suffix][4], 'dispensed.'+suffix, fieldOrder, uniqueKey)
    mergeRecord(records, opts[suffix][5], 'pended.'+suffix, fieldOrder, uniqueKey)
    mergeRecord(records, opts[suffix][6], 'inventory.'+suffix, fieldOrder, uniqueKey)
  }
  return records
}

//Move primary group (Generic/User/From) to the first key of the array instead of the last
//we need it date first for emit order to enable searching etc, but we
///need it group first for sorting within node (expired calculations etc)
function uniqueKey(key, field) {
  let uniqueKey = key.slice()
  let groupBy   = field.slice(0, 9) == 'inventory' ? 'groupByInv' : 'groupByDate'
  let level     = group_level(uniqueKey[1])[groupBy] //replace the 'year'/'month'/'day'/'' group of the key
  uniqueKey[1]  = uniqueKey[level - 1]
  return uniqueKey.slice(0, level-1).join(',') //remove anything after grouping just in case GSNs and/or Brands don't match we still want to group
}

function mergeRecord(rows, record, field, fieldOrder, optional) {

  for (let row of record.rows) {

    let uniqueKey = uniqueKey(row.key, field)

    rows[uniqueKey] = rows[uniqueKey] || {key:row.key, value:Object.assign({}, fieldOrder)}

    /*
    incrementing shouldn't be necessary in long run, but differing GSNs and Brand names are overwriting one another right now.  For example, inventory CSV is showing inventory.qty as 713 (2nd row oeverwrite the first)
    http://13.57.226.134:5984/transaction/_design/inventory.qty-by-generic/_view/inventory.qty-by-generic?group_level=7&startkey=[%228889875187%22,%22month%22,%222018%22,%2209%22,%22Acetaminophen%20500mg%22]&endkey=[%228889875187%22,%22month%22,%222018%22,%2209%22,%22Acetaminophen%20500mg{}%22]
    {"rows":[
    {"key":["8889875187","month","2018","09","Acetaminophen 500mg",null,null],"value":{"sum":2675,"count":85,"min":10,"max":62,"sumsqr":98313}},
    {"key":["8889875187","month","2018","09","Acetaminophen 500mg",null,""],"value":{"sum":713,"count":7,"min":56,"max":200,"sumsqr":86385}}
    ]}*/
    rows[uniqueKey].value[field] = rows[uniqueKey].value[field] || 0
    rows[uniqueKey].value[field] += field.slice(-5) == 'count' ? row.value.count : +(row.value.sum).toFixed(2)
  }
}

//console.log('recordByGeneric opts, rows', opts, rows)
//(Re)sort them in ascending order.  And calculate expired
function sortRecords(rows, excludeExpired) {
  let oldGroup, excess
  return Object.keys(rows).sort().map(key => {
    let row      = rows[key]
    let group    = row.key[row.key.length - 1]
    let excluded = excludeExpired == group

    if ( ! excess || group != oldGroup)
      excess = {count:0, qty:0, value:0}

    //Are count fields included?
    if (row.value['received.count'] != null)
      sortRecord(row, 'count', excess, excluded)

    //Are qty fields included?
    if (row.value['received.qty'] != null)
      sortRecord(row, 'qty', excess, excluded)

    //Are value fields included?
    if (row.value['received.value'] != null)
      sortRecord(row, 'value', excess, excluded)

    oldGroup = group

    return row
  })
}

function sortRecord(row, suffix, excess, excludeExpired) {

  if (row.key[1] == 'day') { //Expiration dates are only stored by month, not day.  So expired and therefore inventory can not be tracked by day
    row.value['inventory.'+suffix] = ''
    row.value['expired.'+suffix] = ''
  } else if (excludeExpired) {
    row.value['expired.'+suffix] = ''
  } else {
    //Can't calculate an expired count like this because repacking can split/combine existing items, meaning that more can be dispensed/disposed/expired than what is received.  Would need to do with using the view
    excess[suffix] += row.value['received.'+suffix] - row.value['refused.'+suffix] - row.value['disposed.'+suffix] - row.value['dispensed.'+suffix] - row.value['pended.'+suffix]
    row.value['expired.'+suffix] = +(excess[suffix] - row.value['inventory.'+suffix]).toFixed(2)
  }
}

function group_level(group) {
  return {
    ''    :{groupByDate:3, groupByInv:5},
    year  :{groupByDate:4, groupByInv:4},
    month :{groupByDate:5, groupByInv:5},
    day   :{groupByDate:6, groupByInv:1}
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
