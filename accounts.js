"use strict"

exports.validate_doc_update = function(newDoc, oldDoc, userCtx) {

  if (newDoc._id.slice(0, 7) == '_local/') return
  if (newDoc._deleted) return

  ensure.prefix = 'account'

  //Required
  ensure('_id').notNull.assert(_id)
  ensure('name').notNull.isString
  ensure('license').notNull.isString
  ensure('street').notNull.isString
  ensure('city').notNull.isString
  ensure('state').notNull.isString.length(2)
  ensure('zip').notNull.regex(/\d{5}/)
  ensure('createdAt').notNull.isDate.notChanged
  ensure('authorized').notNull.isArray

  //Optional
  ensure('ordered').isObject

  function _id(val) {
    return ( ! newDoc._rev && /^[a-z0-9]{7}$/.test(val)) || userCtx.roles[0] == val || 'can only be modified by one of its users'
  }
}

//Note ./startup.js saves views,filters,and shows as toString into couchdb and then replaces
//them with a function that takes a key and returns the couchdb url needed to call them.
//TODO this currently allows for anyone to modify any account.  We need a different way to check viewing vs editing
exports.filter = {
  authorized(doc, req) {
    return doc._id.slice(0, 7) != '_design' //Everyone can see all accounts except design documents
  }
}

exports.view = {
  authorized(doc) {
    emit(doc._id, {rev:doc._rev})
  }
}

exports.show = {
  authorized(doc, req) {
    if ( ! doc) return
    return toJSON([{ok:doc}]) //Everyone can get/put/del all accounts
  }
}

exports.changes = function* (db) {
  yield this.http(exports.filter.authorized(this.url), true)
}

exports.list = function* () {
  yield this.http(exports.view.authorized(), true)
}

exports.get = function* (id) {
  yield this.http(exports.show.authorized(id), true)
}

exports.bulk_get = function* (id) {
  this.status = 400
}

exports.post = function* () {
  this.body            = yield this.http.body
  this.body.createdAt  = new Date().toJSON()
  this.body.authorized = this.body.authorized || []
  delete this.body._rev

  let res = yield this.http.put('accounts/'+this.http.id).body(this.body)

  this.status = res.status

  if (this.status != 201)
    return this.body = res.body

  this.body._id  = res.body.id
  this.body._rev = res.body.rev
}

exports.put = function* () {
  yield this.http(null, true)
}

exports.bulk_docs = function* () {
  yield this.http(null, true)
}

exports.delete = function* (id) {

  yield this.http.get('accounts/'+id, true)

  if (this.status == 200)
    yield this.http.delete(`/drugs/${id}?rev=${account.body._rev}`, true)
}

//TODO need to update shipments account.from/to.name on change of account name
exports.email = function* (id) {
  this.status = 501 //not implemented
}

exports.authorized = {
  *get(id) {
    //Search for all accounts (recipients) that have authorized this account as a sender
    //shortcut to /accounts?selector={"authorized":{"$elemMatch":"${session.account}"}}
    this.status = 501 //not implemented
  },
  *post(id) {
    //Authorize a sender
    let path    = exports.show.authorized(this.account)
    let account = yield this.http(path)

    if (account.body.authorized.includes(id)) {
      this.status  = 409
      this.message = 'This account is already authorized'
    } else {
      account.body.authorized.push(id)
      yield this.http.put(path, true).body(account.body)
    }
  },
  *delete(id) {
    //Un-authorize a sender
    let path    = exports.show.authorized(this.account)
    let account = yield this.http(path)
    let index   = account.body.authorized.indexOf(id)

    if (index == -1) {
      this.status  = 409
      this.message = 'This account is already not authorized'
    } else {
      account.body.authorized.splice(index, 1);
      yield this.http.put(path, true).body(account.body)
    }
  }
}
