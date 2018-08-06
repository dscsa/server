"use strict"
//defaults
module.exports = exports = Object.create(require('../helpers/model'))

let csv = require('csv/server')
let admin = {ajax:{auth:require('../../../keys/dev')}}

exports.views = {
  //Use _bulk_get here instead? Not supported in 1.6
  //this.db.account.get({_id:{$gt:null, $in:accounts[0].authorized}}),
  authorized(doc) {
    for (var i in doc.authorized) {
      emit(doc.authorized[i])
    }
  },

  state(doc) {
    emit(doc.state)
  }
}

exports.get_csv = function*(db) {
  let view = yield this.db.account.allDocs({endkey:'_design', include_docs:true})
  this.body = csv.fromJSON(view.rows)
  this.type = 'text/csv'
}

//This is to find the emptiest bins
exports.binned = function* (id) { //account._id will not be set because google does not send cookie
  const view = yield this.db.transaction.query('inventory-by-bin-verifiedat', {group_level:3, startkey:[id, 'binned'], endkey:[id, 'binned', {}]}) //exclude repack bins from empty bins
  let sortAsc = view.rows.sort((a, b) => a.value.count - b.value.count)
  this.body  = csv.fromJSON(sortAsc, this.query.fields && this.query.fields.split(','))
}

//Shows everything in inventory AND all ordered items not in inventory
exports.inventory = function* (to_id) { //account._id will not be set because google does not send cookie

  let minExp   = new Date()
  let minMonth = minExp.getMonth() + (+this.query.buffer || 0) - 1 // - 1 because we use expireds until the end of the month
  minExp.setMonth(minMonth) //internal search does 1 month, so let's pad it by an additional month
  let [year, month] = minExp.toJSON().split('-')

  let opts = {
    group_level:5, //by drug.generic
    startkey:[to_id, 'month', year, month],
    endkey:[to_id, 'month', year, month+'\uffff']
  }

  const [inventory, account] = yield [
    this.db.transaction.query('inventory.qty-by-generic', opts),
    this.db.account.get(to_id)
  ]

  //Match inventory with ordered when applicable
  let rows = inventory.rows.map(row => {
    let generic = row.key[opts.group_level-1]

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

  this.body = csv.fromJSON(rows, this.query.fields && this.query.fields.split(','))
}

exports.recordByGeneric = function* (to_id) { //account._id will not be set because google does not send cookie
  let [qtyRecords, valueRecords] = yield [
    getRecords.call(this, to_id, 'qty-by-generic-ndc'),
    getRecords.call(this, to_id, 'value-by-generic-ndc')
  ]

  let records = {}
  mergeRecords(qtyRecords, 'count', records)
  mergeRecords(qtyRecords, 'qty', records)
  mergeRecords(valueRecords, 'value', records)

  records = sortRecords(records)

  this.body = csv.fromJSON(records, this.query.fields && this.query.fields.split(','))
}

exports.recordByUser = function* (to_id) { //account._id will not be set because google does not send cookie

  let qtyRecords = yield getRecords.call(this, to_id, 'qty-by-user-from-shipment')

  let records = {}
  mergeRecords(qtyRecords, 'count', records)
  mergeRecords(qtyRecords, 'qty', records)
  records = sortRecords(records)

  this.body = csv.fromJSON(records, this.query.fields && this.query.fields.split(','))
}

exports.recordByFrom = function* (to_id) { //account._id will not be set because google does not send cookie

  let [qtyRecords, valueRecords] = yield [
    getRecords.call(this, to_id, 'qty-by-from-generic-ndc'),
    getRecords.call(this, to_id, 'value-by-from-generic-ndc')
  ]

  let records = {}
  mergeRecords(qtyRecords, 'count', records)
  mergeRecords(qtyRecords, 'qty', records)
  mergeRecords(valueRecords, 'value', records)

  records = sortRecords(records)

  this.body = csv.fromJSON(records, this.query.fields && this.query.fields.split(','))
}

function* getRecords (to_id, suffix) {
  //TODO Enable people to pick only certain fields so we don't need all these queries
  ///We can also reduce the lines of code by doing a for-loop accross the stages
  let group  = this.query.group || ''
  let opts   = {
    group_level:this.query.group_level ? +this.query.group_level + 2 : groupby(group).level, //default is by drug.generic.  Add 2 for to_id and year/month/day key
    startkey:[to_id, group].concat(this.query.startkey || []),
    endkey:[to_id, group].concat(this.query.endkey || [])
  }

  opts.endkey[opts.endkey.length] = {}

  let records = yield [
    this.db.transaction.query('received.'+suffix, opts),
    this.db.transaction.query('verified.'+suffix, opts),
    this.db.transaction.query('expired.'+suffix, opts),
    this.db.transaction.query('disposed.'+suffix, opts),
    this.db.transaction.query('dispensed.'+suffix, opts),
    this.db.transaction.query('pended.'+suffix, opts),
  ]
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
       //specify csv column order here -- TODO default to user supplied this.query.fields
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

//Context-specific - options MUST have 'this' property in order to work.
function authorized(doc, val, key, opts) {

  if (this.account._id)
    return doc._id == this.account._id

  if (exports.isNew(doc, opts)) {
    console.log('account is new')
    return this.ajax = admin.ajax, true //enable user to be created even though current user doesn't exist and therefor doesn't have allAccounts role
  }

  console.log('account is not authorized', doc._rev, opts)
  return false
}

exports.authorized = {
  *get() {
    //Search for all accounts (recipients) that have authorized this account as a sender
    //shortcut to /accounts?selector={"authorized":{"$elemMatch":"${session.account}"}}
    this.status = 501 //not implemented
  },

  *post() {
    //Authorize a sender
    console.log(this.account._id, this.req.body)
    let account = yield this.db.account.get(this.account._id)
    console.log(account.authorized, account.authorized.indexOf(this.req.body))
    //allow body to be an array of ids to authorize
    let index = account.authorized.indexOf(this.req.body)

    if (index != -1) {
      this.status  = 409
      this.message = 'This account is already authorized'
    } else {
      account.authorized.push(this.req.body)
      this.body = yield this.db.account.put(account, {this:this})
      this.body.authorized = account.authorized
    }
  },

  *delete() {
    //Unauthorize a sender
    let account = yield this.db.account.get(this.account._id)

    //allow body to be an array of ids to unauthorize
    let index   = account.authorized.indexOf(this.req.body)

    if (index == -1) {
      this.status  = 409
      this.message = 'This account is already not authorized'
    } else {
      account.authorized.splice(index, 1)
      this.body = yield this.db.account.put(account, {this:this})
      this.body.authorized = account.authorized
    }
  }
}

exports.pend = {

  *post(_id, name) {
    this.account = {_id}
    this.body = yield updateNext(this, [{pending:{_id:name}, createdAt:new Date().toJSON()}])
  },

  *delete(_id, name) {
    this.account = {_id}
    this.body = yield updateNext(this, [])
  }
}

exports.dispense = {

  *post(_id) {
    this.account = {_id}
    this.body = yield updateNext(this, [{dispensed:{}, createdAt:new Date().toJSON()}])
  },

  // *delete(_id) {
  //   this.account = {_id}
  //   this.body = yield patchNext(this, [])
  // }
}

exports.dispense = {

  *post(_id) {
    this.account = {_id}
    this.body = yield updateNext(this, [{dispose:{}, createdAt:new Date().toJSON()}])
  },

  // *delete(_id) {
  //   this.account = {_id}
  //   this.body = yield patchNext(this, [])
  // }
}

function updateNext($this, next) {
  for (let transaction of $this.req.body) {
    transaction.next = next
  }
  return $this.db.transaction.bulkDocs($this.req.body, {this:$this})
}
