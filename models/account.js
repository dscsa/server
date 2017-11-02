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

//Shows everything in inventory AND all ordered items not in inventory
exports.inventory = function* (id) { //account._id will not be set because google does not send cookie
  const [inventory, account] = yield [
    this.db.transaction.query('inventory', opts(1, id)),
    this.db.account.get(id)
  ]

  //Match inventory with ordered when applicable
  let rows = inventory.rows.map(row => {
    let generic = row.key[1]

    if (account.ordered[generic]) {
      row.value.ordered = true
      row.value.order = account.ordered[generic]
      delete account.ordered[generic]
    }

    return row
  })

  //Add unmatched orders to the end of array
  for (let generic in account.ordered)
    rows.push({key:[id, generic], value:{ordered:true, order:account.ordered[generic]}})

  this.body = csv.fromJSON(rows, this.query.fields && this.query.fields.split(','))
}

exports.metrics = function* (id) { //account._id will not be set because google does not send cookie
  let options = opts(this.query.group_level, id)
  const [qty, value, count] = yield [
    this.db.transaction.query('qty', options),
    this.db.transaction.query('value', options),
    this.db.transaction.query('count', options)
  ]

  let rows = qty.rows.map((row, i) => {
    return {key:row.key, value:Object.assign(row.value, value.rows[i].value, count.rows[i].value)}
  })

  this.body = csv.fromJSON(rows, this.query.fields && this.query.fields.split(','))
}

exports.record = function* (id) { //account._id will not be set because google does not send cookie
  const view = yield this.db.transaction.query('record', opts(this.query.group_level, id))
  this.body  = csv.fromJSON(view.rows, this.query.fields && this.query.fields.split(','))
}

exports.users = function* (id) { //account._id will not be set because google does not send cookie
  const view = yield this.db.transaction.query('users', opts(this.query.group_level, id))
  this.body  = csv.fromJSON(view.rows, this.query.fields && this.query.fields.split(','))
}

exports.bins = function* (id) { //account._id will not be set because google does not send cookie
  const view = yield this.db.transaction.query('inventory.bins', opts(this.query.group_level, id))
  let sortAsc = view.rows.sort((a, b) => a.value - b.value)
  this.body  = csv.fromJSON(sortAsc, this.query.fields && this.query.fields.split(','))
}

function opts(group_level = 0, id) {
   return {group_level:+group_level+1, startkey:[id], endkey:[id, {}]}
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
