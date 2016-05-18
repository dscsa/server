"use strict"
let secret = require('../development')
let auth   = 'Basic '+new Buffer(secret.username+':'+secret.password).toString('base64')

exports.validate_doc_update = function(newDoc, oldDoc, userCtx) {

  if (newDoc._id.slice(0, 7) == '_local/') return
  if (newDoc._deleted) return

  var id = /^[a-z0-9]{7}$/

  ensure.prefix = 'user'

  ensure('account._id').assert(accountId)
  ensure('first').notNull.isString
  ensure('last').notNull.isString
  ensure('name').notNull.regex(/\w{2,}@\w{3,}\.(com|org|net|gov)/)
  ensure('phone').notNull.regex(/\d{3}\.\d{3}\.\d{4}/)
  ensure('createdAt').notNull.isDate.notChanged
  ensure('roles').assert(roles)

  function accountId(val) {
    if (userCtx.roles[0] == '_admin' && ! newDoc._rev && id.test(val)) return

    return userCtx.roles[0] == val || 'can only be modified by one of its users'
  }

  function roles(val) {
    if ( ! isArray(val) || val.length != 2 || ! id.test(val[0]))
      return 'must be an array in the form [<account._id>, "user"]'
  }
}
//Note ./startup.js saves views,filters,and shows as toString into couchdb and then replaces
//them with a function that takes a key and returns the couchdb url needed to call them.
exports.filter = {
  authorized(doc, req) {
    if (doc._id.slice(0, 7) == '_design') return
  
    return doc.account._id == req.userCtx.roles[0] //Only see users within your account
  }
}

exports.view = {
  authorized(doc) {
    emit(doc.account._id, {rev:doc._rev})
  }
}

exports.show = {
  authorized(doc, req) {
    if ( ! doc) return
    if (doc.account._id == req.userCtx.roles[0]  )
      return toJSON([{ok:doc}])
  }
}

exports.changes = function* (db) {
  yield this.http(exports.filter.authorized(this.url), true)
}

exports.list = function* () {
  //authorize(this.headers)
  yield this.http(exports.view.authorized(this.account), true)
}

exports.get = function* (id) {
  //authorize(this.headers)
  yield this.http(exports.show.authorized(id), true)
}

exports.bulk_get = function* (id) {
  //authorize(this.headers)
  this.status = 400
}

//CouchDB requires an _id based on the user's name
exports.post = function* () {
  this.body = yield this.http.body

  this.body.createdAt = new Date().toJSON()
  this.body.type      = 'user'
  this.body.roles     = [this.body.account._id, 'user']

  authorize(this.headers) //since user does not have a user context yet we need to explicitly set admin privledges
  let res = yield this.http.put('_users/org.couchdb.user:'+this.body.name).body(this.body)

  this.status = res.status

  if (this.status != 201)
    return this.body = res.body

  this.body._id  = res.body.id
  this.body._rev = res.body.rev
}

//TODO use an id?  Rely on _id being embedded? Maybe make PUTs default behavior to be PATCH?
exports.put = function* () {
  yield this.http(this.url.replace('users/', '_users/'), true)
}

exports.bulk_docs = function* () {
  yield this.http(this.url.replace('users/', '_users/'), true)
}

exports.delete = function* (id) {
  yield this.http.get('users/'+id, true)

  if (this.status == 200)
    yield this.http.delete(`/_users/${id}?rev=${user.body._rev}`, true)
}

exports.email = function* (id) {
  this.status = 501 //not implemented
}

exports.session = {
  *post(id) {
    let login = yield this.http.body

    this.headers.referer = 'http://'+this.headers.host
    login.name = id

    yield this.http('_session', true).headers(this.headers).body(login)

    if (this.status != 200) return

    let user = yield this.http.get('_users/org.couchdb.user:'+id)

    this.body = user.body
    delete this.body.roles
    delete this.body.type
    this.cookies.set('AuthAccount', this.body.account._id)

    let account = yield this.http.get('accounts/'+this.body.account._id)

    this.body.account = account.body
  },

  *delete(id) {
    this.cookies.set('AuthAccount', '')
    yield this.http('_session', true)
  }
}

//Unfortunately views and _changes only work if given admin privledges (even with _users table is public)
//two options: (1) make all users admins on _users using roles or (2) escalate certain requests to admin
//on a per route basis.  I couldn't figure out a way to escalate while retaining and verifying the user's
//account, so I went with #1 for now.

//TODO Highly INSECURE right now. Any request to users has admin privledges!!!
//Maybe only put admin headers for post request
//TODO Problem Only Admins Can Access Views of system dbs however if we escalate
//user to an admin then their context doesn't work anymore.  Make "user" role an admin on _user table?
//Unfortunately non-admins cannot access views even if _users table is set to public.

//TODO do a query beforehand to make sure someone is only changing users in their account
function authorize(headers) {
  headers.authorization = auth
  delete headers.cookie //Cookie overrides Basic Auth so we need to delete
}
