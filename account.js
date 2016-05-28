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
  ensure('state').notNull.isString.length(2).notChanged
  ensure('zip').notNull.regex(/\d{5}/)
  ensure('createdAt').notNull.isDate.notChanged
  ensure('authorized').notNull.isArray

  //Optional
  ensure('ordered').isObject

  function _id(val) {
    return ( ! newDoc._rev && /^[a-z0-9]{7}$/.test(val)) || userCtx.roles[0] == val || userCtx.roles[0] == '_admin' || 'can only be modified by one of its users'
  }
}

//Note ./startup.js saves views,filters,and shows as toString into couchdb and then replaces
//them with a function that takes a key and returns the couchdb url needed to call them.
//TODO this currently allows for anyone to modify any account.  We need a different way to check viewing vs editing
exports.filter = {
  authorized(doc, req) {
    if (doc._deleted) return true
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
    if ( ! doc)
      return {code:404}

    return toJSON(req.query.open_revs ? [{ok:doc}]: doc) //Everyone can get/put/del all accounts
  }
}

exports.changes = function* () {
  yield this.http(exports.filter.authorized(this.url), true)
}

exports.list = function* () {
  yield this.http(exports.view.authorized(), true)
}

exports.get = function* () {
  let selector = JSON.parse(this.query.selector)

  if (selector._id)
    yield this.http(exports.show.authorized(selector._id), true)
  //show function cannot handle _deleted docs with open_revs, so handle manually here
  if (this.status == 404 && this.query.open_revs)
    yield this.http.get(this.path+'/'+selector._id, true)
}

exports.bulk_get = function* (i) {
  this.status = 400
}

exports.post = function* () {
  this.body            = yield this.http.body
  this.body.createdAt  = new Date().toJSON()
  this.body.authorized = this.body.authorized || []
  delete this.body._rev

  let res = yield this.http.put('account/'+this.http.id).body(this.body)

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
  yield this.http(null, true)
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
    let body    = yield this.http.body
    let account = yield this.http.get(exports.show.authorized(this.user.account._id))

    account = account.body
    if (account.authorized.includes(body._id)) {
      this.status  = 409
      this.message = 'This account is already authorized'
    } else {
      account.authorized.push(body._id)
      yield this.http.put('account/'+this.user.account._id, true).body(account)
    }
  },
  *delete() {
    //Unauthorize a sender
    let body    = yield this.http.body
    let account = yield this.http.get(exports.show.authorized(this.user.account._id))

    account   = account.body
    let index = account.authorized.indexOf(body._id)

    if (index == -1) {
      this.status  = 409
      this.message = 'This account is already not authorized'
    } else {
      account.authorized.splice(index, 1)
      yield this.http.put('account/'+this.user.account._id, true).body(account)
    }
  }
}
