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

  let [invYear, invMonth] = currentDate(ctx.query.min_exp_months, true)

  let invOpts = {
    group_level:7, //by drug.generic, drug.gsns, drug.brand,
    startkey:[to_id, 'month', invYear, invMonth],
    endkey:[to_id, 'month', invYear, invMonth+'\uffff']
  }

  let [disYear, disMonth] = currentDate(-ctx.query.dispensed_months, true)

  let disOpts = {
    group_level:7, //by drug.generic, drug.gsns, drug.brand,
    startkey:[to_id, 'month', disYear, disMonth],
    endkey:[to_id, 'month', disYear, {}]
  }

  const [inventory, dispensed, account] = await Promise.all([
    ctx.db.transaction.query('inventory.qty-by-generic', invOpts),
    ctx.db.transaction.query('dispensed.qty-by-generic', disOpts),
    ctx.db.account.get(to_id)
  ])

  console.log('inventory.csv', 'invOpts', invOpts, inventory.rows.length)
  console.log('inventory.csv', 'disOpts', disOpts, dispensed.rows.length)

  let drugs = {}
  mergeRecord(drugs, inventory, 'inventory.qty', genericKey)
  mergeRecord(drugs, dispensed, 'dispensed.qty', genericKey)

  //Match inventory with ordered when applicable
  for (let i in drugs) {

    delete drugs[i].value.group //we will use key.2 instead
    let generic = drugs[i].key[4]

    if (account.ordered[generic]) {
      setOrderFields(generic, account, drugs[i].value)
      delete account.ordered[generic]
    }
  }

  //Add unmatched orders to the end of array.  Match fields in the order they were emitted
  for (let generic in account.ordered)
    drugs[generic] = {
      key:[to_id, '', invYear, invMonth, generic],
      value:setOrderFields(generic, account, {})
    }

  drugs = Object.keys(drugs).map(i => drugs[i])

  ctx.body = csv.fromJSON(drugs, ctx.query.fields)
}

function genericKey(key) {
  return key[4]
}

function setOrderFields(generic, account, res ) {
  res.ordered   = true
  res['order.price30']   = account.ordered[generic].price30   || (account.ordered[generic].price90 ? '' : account.default.price30)
  res['order.price90']   = account.ordered[generic].price90   || (account.ordered[generic].price30 ? '' : account.default.price90)
  res['order.repackQty'] = account.ordered[generic].repackQty || account.default.repackQty
  res['order.minQty']    = account.ordered[generic].minQty || account.default.minQty
  res['order.minDays']   = account.ordered[generic].minDays || account.default.minDays
  res['order.maxInventory']   = account.ordered[generic].maxInventory || account.default.maxInventory
  res['order.displayMessage'] = account.ordered[generic].displayMessage
  return res
}

exports.recordByGeneric = async function  (ctx, to_id) { //account._id will not be set because google does not send cookie

  console.time('Get recordByGeneric')

  let [qtyRecords, valueRecords] = await Promise.all([
    getRecords(ctx, to_id, 'qty-by-generic'),
    getRecords(ctx, to_id, 'value-by-generic')
  ])

  console.timeEnd('Get recordByGeneric')
  console.time('Merge recordByGeneric')

  let records = mergeRecords({qty:qtyRecords,count:qtyRecords, value:valueRecords})

  console.timeEnd('Merge recordByGeneric')
  console.time('Sort recordByGeneric')

  records = sortRecords(records)

  console.timeEnd('Sort recordByGeneric')
  console.time('To CSV recordByGeneric')

  ctx.body = csv.fromJSON(records, ctx.query.fields || defaultFieldOrder())

  console.timeEnd('To CSV recordByGeneric')
}

exports.recordByFrom = async function (ctx, to_id) { //account._id will not be set because google does not send cookie

  console.time('Get recordByFrom')

  let [qtyRecords, valueRecords] = await Promise.all([
    getRecords(ctx, to_id, 'qty-by-from-generic'),
    getRecords(ctx, to_id, 'value-by-from-generic')
  ])

  console.timeEnd('Get recordByFrom')
  console.time('Merge recordByFrom')

  let records = mergeRecords({qty:qtyRecords,count:qtyRecords, value:valueRecords})

  console.timeEnd('Merge recordByFrom')
  console.time('Sort recordByFrom')

  records = sortRecords(records, to_id)

  console.timeEnd('Sort recordByFrom')
  console.time('To CSV recordByFrom')

  ctx.body = csv.fromJSON(records, ctx.query.fields || defaultFieldOrder())

  console.timeEnd('To CSV recordByFrom')
}

exports.recordByUser = async function  (ctx, to_id) { //account._id will not be set because google does not send cookie

  //If group_level by From or Shipment, let's add in some demornalized accout data that we can use in the V1 & V2 Merge gSheet
  //Baseline is group by [to_id, user], we need at least [to_id, user, from] in order to add account data.
  //NULL group_level will just result in a negative integer
  let defaultLevel = default_group_level(ctx.query.group || '').groupByDate

  //For example, group_level == 1 for user, so 1 + 2 - 3 == 0 and we can't show accounts, but group_level 2+ we would want to show accounts
  let denormalize  = +ctx.query.group_level + 2 - defaultLevel  //+2 because we don't make user group by first two keys [to_id, ''/'year'/'month'/'day']

  console.log('START: recordByUser','group:', ctx.query.group, 'group_level:', +ctx.query.group_level, 'default_level:', defaultLevel, 'denormalize:', denormalize)

  console.time('Get recordByUser')

  let [qtyRecords, valueRecords, accounts] = await Promise.all([
    getRecords(ctx, to_id, 'qty-by-user-from-shipment'),
    getRecords(ctx, to_id, 'value-by-user-from-shipment'),
    denormalize >= 1 ? this.db.account.allDocs({endkey:'_design', include_docs:true}) : null
  ])

  console.timeEnd('Get recordByUser')
  console.time('Merge recordByUser')

  let records = mergeRecords({qty:qtyRecords,count:qtyRecords, value:valueRecords})

  console.timeEnd('Merge recordByUser')
  console.time('Sort recordByUser')

  records = sortRecords(records)

  console.timeEnd('Sort recordByUser')
  console.time('Add Accounts recordByUser')

  if (accounts) {
    let accountMap = {}

    for (let account of accounts.rows)
      accountMap[account.id] = account.doc

    for (let record of records) {
      console.log('Denormalizing recordByUser', record.key[defaultLevel+1], defaultLevel, record.key)
      record.value['shipment.from'] = accountMap[record.key[defaultLevel+1]] //default key level is "user", so we need +1 to get to "from"
    }
  }

  console.timeEnd('Add Accounts recordByUser')
  console.time('To CSV recordByUser')

  ctx.body = csv.fromJSON(records, ctx.query.fields || defaultFieldOrder(accounts))
  console.timeEnd('To CSV recordByUser')
}

function defaultFieldOrder(shipment) {
  return [
    'group',
    'entered.count',
    'refused.count',
    'verified.count',
    'expired.count',
    'disposed.count',
    'dispensed.count',
    'pended.count',
    'inventory.count',
    'entered.qty',
    'refused.qty',
    'verified.qty',
    'expired.qty',
    'disposed.qty',
    'dispensed.qty',
    'pended.qty',
    'inventory.qty',
    'entered.value',
    'refused.value',
    'verified.value',
    'expired.value',
    'disposed.value',
    'dispensed.value',
    'pended.value',
    'inventory.value'
  ]
  .concat( ! shipment ? [] :
  [
    'shipment.from._id',
    'shipment.from.name',
    'shipment.from.license',
    'shipment.from.state',
    'shipment.from.phone',
    'shipment.from.createdAt',
  ])
  .concat([
    'key.0',
    'key.1',
    'key.2',
    'key.3'
  ])
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
    group_level:default_group_level(group).groupByDate,
    startkey:[to_id, group].concat(startkey(ctx.query.startkey)),
    endkey:[to_id, group].concat(endkey(ctx.query.endkey))
  }

  //Unlike the others inventory dates can be in the future (e.g, emitted every month until they expire).  We only want ones in
  //the past emit([to_id, 'month', year, month, doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, sortedDrug, doc.bin], val)
  let invDate = group ? [] : currentDate(1, true).slice(0, 2)
  let invOpts = {
    group_level:default_group_level(group).groupByInv + invDate.length,
    startkey:[to_id, group || 'month'].concat(invDate).concat(startkey(ctx.query.startkey)),
      endkey:[to_id, group || 'month'].concat(invDate).concat(endkey(ctx.query.endkey))
  }

  //Advanced use cases (Form 8283) might call for specifying a custom group level
  if (ctx.query.group_level) {
    console.log('group_level', invOpts.group_level, ctx.query.group_level, opts.group_level)
    invOpts.group_level += +ctx.query.group_level + 2 - opts.group_level //we keep the inventory Group level relative to the new, custom group_level
    opts.group_level     = +ctx.query.group_level + 2
  }

  console.log('getRecords', 'opts', opts)

  //Inventory cannot be kept by day because expiration date is kept by month.
  //Might be possible to eventually get it for custom group_level but doesn't seem worth trying to figure that out now.
  let queries = [
    optionalField(ctx, 'entered.'+suffix, opts),
    optionalField(ctx, 'refused.'+suffix, opts),
    optionalField(ctx, 'verified.'+suffix, opts),
    optionalField(ctx, 'expired.'+suffix, opts),
    optionalField(ctx, 'disposed.'+suffix, opts),
    optionalField(ctx, 'dispensed.'+suffix, opts),
    optionalField(ctx, 'pended.'+suffix, opts)
  ]

  if (group === '' || group === 'month' || group === 'year') //inventory is not kept by day and other groupings not listed here
    console.log('getRecords', 'invOpts', invOpts)
    queries.push(optionalField(ctx, 'inventory.'+suffix, invOpts).then(res => {
      //console.log('res', res && res.rows)
      group || res && res.rows.forEach(row => { row.key[1] = ''; row.key.splice(2, 2)}) //remove year and month from keys if no grouping is specified
      return res
    }))

  let records = await Promise.all(queries)

  return records
}

function optionalField(ctx, field, opts) {


  let fields = ctx.query.fields
  if (fields) {
    let fieldType = field.split('-')[0] //Hacky as this relies on consistent naming of fields.  eg.  dispensed.value-by-user-from-shipment -> dispensed.value
    fields = fields.replace(/\.count/g, '.qty') //qty views use the _stat reduce which supplies the count.  There are no count views
    if ( ! fields.includes(fieldType)) return Promise.resolve()
  }
  //console.log('optionalField', ctx.query.fields, field)
  return ctx.db.transaction.query(field, opts)
}

//Something like {qty:records, count:records}
function mergeRecords(opts) {
  let records = {}
  for (let suffix in opts) {
    mergeRecord(records, opts[suffix][0], 'entered.'+suffix, uniqueKey)
    mergeRecord(records, opts[suffix][1], 'refused.'+suffix, uniqueKey)
    mergeRecord(records, opts[suffix][2], 'verified.'+suffix, uniqueKey)
    mergeRecord(records, opts[suffix][3], 'expired.'+suffix, uniqueKey)
    mergeRecord(records, opts[suffix][4], 'disposed.'+suffix, uniqueKey)
    mergeRecord(records, opts[suffix][5], 'dispensed.'+suffix, uniqueKey)
    mergeRecord(records, opts[suffix][6], 'pended.'+suffix, uniqueKey)
    mergeRecord(records, opts[suffix][7], 'inventory.'+suffix, uniqueKey)
  }
  return records
}

//Move primary group (Generic/User/From) to the first key of the array instead of the last
//we need it date first for emit order to enable searching etc, but we
///need it group first for sorting within node (expired calculations etc)
function uniqueKey(key, field) {
  key = key || []
  let groupBy = field.slice(0, 9) == 'inventory' ? 'groupByInv' : 'groupByDate'
  let level   = default_group_level(key[1])[groupBy] - 1
  let unique = key.slice(level).concat(key.slice(2, level)) // remove to_id and group and then move our date prefixes to end of key
  return unique.join(',') //remove to_id and anything after grouping just in case GSNs and/or Brands don't match we still want to group
}

function mergeRecord(rows, record, field, groupFn) {

  if ( ! record) return

  for (let row of record.rows) {

    let group = groupFn(row.key, field)

    rows[group] = rows[group] || {key:row.key, value:{group}}

    /*
    incrementing shouldn't be necessary in long run, but differing GSNs and Brand names are overwriting one another right now.  For example, inventory CSV is showing inventory.qty as 713 (2nd row oeverwrite the first)
    http://13.57.226.134:5984/transaction/_design/inventory.qty-by-generic/_view/inventory.qty-by-generic?group_level=7&startkey=[%228889875187%22,%22month%22,%222018%22,%2209%22,%22Acetaminophen%20500mg%22]&endkey=[%228889875187%22,%22month%22,%222018%22,%2209%22,%22Acetaminophen%20500mg{}%22]
    {"rows":[
    {"key":["8889875187","month","2018","09","Acetaminophen 500mg",null,null],"value":{"sum":2675,"count":85,"min":10,"max":62,"sumsqr":98313}},
    {"key":["8889875187","month","2018","09","Acetaminophen 500mg",null,""],"value":{"sum":713,"count":7,"min":56,"max":200,"sumsqr":86385}}
    ]}*/
    rows[group].value[field] = rows[group].value[field] || 0
    rows[group].value[field] += field.slice(-5) == 'count' ? row.value.count : +(row.value.sum).toFixed(2)
  }
}

//console.log('recordByGeneric opts, rows', opts, rows)
//(Re)sort them in ascending order.  And calculate expired
function sortRecords(rows) {
  return Object.keys(rows).sort().map(key => rows[key])
}

function default_group_level(key) {
  return {
    ''    : {groupByDate:3, groupByInv:3}, //(default) [to_id:1, '':2, group:3...]
    year  : {groupByDate:4, groupByInv:4}, //[to_id:1, 'year':2, year:3, group:4...]
    month : {groupByDate:5, groupByInv:5}, //[to_id:1, 'month':2, year:3, month:4, group:5...]
    day   : {groupByDate:6, groupByInv:5}  //[to_id:1, 'day':2, year:3, month:4, day:5, group:6...]   //Inventory doesn't have group by day so do group by month instead
  }[key] || {groupByDate:2, groupByInv:1}  //[to_id:1, group[1]:2, year:3, month:4, day:5, group[2+]:6...] //Default in case they are searching for a specific from/user/generic
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
    ctx.body = await updateNext(ctx, [{pended:{_id:name}, user:{_id}, createdAt:new Date().toJSON()}])
  },

  async delete(ctx, _id, name) {
    const pendId = name.split(' - ')[0] //mirron client's inventory.js hacky getPendId method
    const result = await ctx.db.transaction.query('pended-by-name-bin', {include_docs:true, startkey:[_id, name], endkey:[_id, name+'\uffff']})
    ctx.req.body = result.rows.map(row => row.doc)
    ctx.account  = {_id}
    ctx.body     = await updateNext(ctx, [])
  }
}

exports.dispense = {

  async post(ctx, _id) {
    ctx.account = {_id}
    ctx.body = await updateNext(ctx, [{dispensed:{}, user:{_id}, createdAt:new Date().toJSON()}])
  },

  // async delete(ctx, _id) {
  //   ctx.account = {_id}
  //   ctx.body = await patchNext(ctx, [])
  // }
}

exports.dispose = {

  async post(ctx, _id) {
    ctx.account = {_id}
    ctx.body = await updateNext(ctx, [{disposed:{}, user:{_id}, createdAt:new Date().toJSON()}])
  },

  // async delete(ctx, _id) {
  //   ctx.account = {_id}
  //   ctx.body = await patchNext(ctx, [])
  // }
}

function updateNext(ctx, next) {
  console.log('account.updateNext', ctx.req.body.length, next, ctx.req.body)
  for (let transaction of ctx.req.body) {
    transaction.next = next
  }
  return ctx.db.transaction.bulkDocs(ctx.req.body, {ctx})
}
