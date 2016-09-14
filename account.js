"use strict"

exports.lib = {}

exports.validate = function(newDoc, oldDoc, userCtx) {

  var id = /^[a-z0-9]{7}$/
  var ensure = require('ensure')('account', arguments)

  //Required
  ensure('_id').notNull.assert(validId)
  ensure('name').notNull.isString
  ensure('license').notNull.isString
  ensure('street').notNull.isString
  ensure('city').notNull.isString
  ensure('state').notNull.isString.length(2).notChanged
  ensure('zip').notNull.regex(/\d{5}/)
  ensure('createdAt').notNull.isDate.notChanged
  ensure('authorized').notNull.isArray

  //Optional
  ensure('ordered').isObject

  function validId(val) {
    return require('isRole')(newDoc, userCtx) || 'can only be modified by one of its users'
  }
}

exports.get = function* () {
  let s = JSON.parse(this.query.selector)

  //TODO remove this once bulk_get is supported and we no longer need to handle replication through regular get
  if (s._id)
    return yield this.query.open_revs
      ? this.http.get('account/'+s._id)
      : this.db.account.list.id(s._id)
}

exports.post = function* () {
  let doc        = yield this.http.body
  doc.createdAt  = new Date().toJSON()
  doc.authorized = doc.authorized || []
  doc._rev       = undefined

  let save = yield this.http.put('account/'+this.http.id, doc).body

  doc._id  = save.id
  doc._rev = save.rev
  this.body = doc
}

exports.put = function* () {
  yield this.http()
}

exports.bulk_docs = function* () {
  yield this.http()
}

exports.delete = function* (id) {
  yield this.http()
}

//TODO need to update shipments account.from/to.name on change of account name
exports.email = function* (id) {
  this.status = 501 //not implemented
}

exports.authorized = {
  *get() {
    //Search for all accounts (recipients) that have authorized this account as a sender
    //shortcut to /accounts?selector={"authorized":{"$elemMatch":"${session.account}"}}
    this.status = 501 //not implemented
  },
  *post() {
    //Authorize a sender
    let body     = yield this.http.body
    let accounts = yield this.db.account.list.id(this.session.account._id).body
    let allAccounts = yield this.db.account.list.id().body

    if (accounts[0].authorized.includes(body._id)) {
      this.status  = 409
      this.message = 'This account is already authorized'
    } else {
      accounts[0].authorized.push(body._id)
      yield this.http.put('account/'+accounts[0]._id, accounts[0])
    }
  },
  *delete() {
    //Unauthorize a sender
    let body     = yield this.http.body
    let accounts = yield this.db.account.list.id(this.session.account._id).body
    let index    = accounts[0].authorized.indexOf(body._id)

    if (index == -1) {
      this.status  = 409
      this.message = 'This account is already not authorized'
    } else {
      accounts[0].authorized.splice(index, 1)
      yield this.http.put('account/'+accounts[0]._id, accounts[0])
    }
  }
}
