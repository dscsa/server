"use strict"
let couchdb = require('./couchdb')

exports.validate_doc_update = couchdb.inject(couchdb.ensure, function(ensure, newDoc, oldDoc, userCtx) {

  var id = /^[a-z0-9]{7}$/
  ensure = ensure('account', newDoc, oldDoc)

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
    if ( ! id.test(val) || (newDoc._rev && userCtx.roles[0] != val && userCtx.roles[0] != '_admin'))
      return 'can only be modified by one of its users'
  }
})

//Note ./startup.js saves views,filters,and shows as toString into couchdb and then replaces
//them with a function that takes a key and returns the couchdb url needed to call them.
//TODO this currently allows for anyone to modify any account.  We need a different way to check viewing vs editing
exports.filter = {
  authorized(doc, req) {
    if (doc._id.slice(0, 7) == '_design') return
    return true //Everyone can see all accounts except design documents
  }
}

exports.show = {
  authorized(doc, req) {
    if ( ! doc) return {code:204}

    return toJSON(req.query.open_revs ? [{ok:doc}]: doc) //Everyone can get/put/del all accounts
  }
}

exports.view = {
  authorized(doc) {
    emit(doc._id, {rev:doc._rev})
  }
}

exports.changes = function* () {
  this.req.setTimeout(20000)
  yield this.http(exports.filter.authorized(this.path), true)
}

exports.get = function* () {
  let selector = JSON.parse(this.query.selector)

  if ( ! selector._id) return //TODO other search types

  yield this.http(exports.show.authorized(selector._id), true)

  //show function cannot handle _deleted docs with open_revs, so handle manually here
  if (this.status == 204 && this.query.open_revs)
    yield this.http.get(this.path+'/'+selector._id, true)
}

exports.bulk_get = function* (i) {
  this.status = 400
}

exports.post = function* () {
  this.body            = yield this.http.body
  this.body.createdAt  = new Date().toJSON()
  this.body.authorized = this.body.authorized || []
  this.body._rev       = undefined

  let save = yield this.http.put('account/'+this.http.id).body(this.body)

  this.body._id  = save.id
  this.body._rev = save.rev
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
    let index   = account.authorized.indexOf(body._id)

    if (index == -1) {
      this.status  = 409
      this.message = 'This account is already not authorized'
    } else {
      account.authorized.splice(index, 1)
      yield this.http.put('account/'+this.user.account._id, true).body(account)
    }
  }
}
