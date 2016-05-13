"use strict"

let secret = require('../development')
let auth   = 'Basic '+new Buffer(secret.username+':'+secret.password).toString('base64')

//Unfortunately views and _changes only work if given admin privledges (even with _users table is public)
//two options: (1) make all users admins on _users using roles or (2) escalate certain requests to admin
//on a per route basis.  I couldn't figure out a way to escalate while retaining and verifying the user's
//account, so I went with #1 for now.
exports.validate_doc_update = function(newDoc, oldDoc, userCtx) {
  if (newDoc._id.slice(0, 7) == '_local/')
    return

  if ( ! newDoc.account || ! newDoc.account._id)
    throw({forbidden:'user.account must be an object with _id. Got '+toJSON(newDoc)})

  if ( ! isArray(newDoc.roles) || newDoc.roles.length != 2)
    throw({forbidden:'user.roles must be in the form [<account._id>, "user"]. Got '+toJSON(newDoc)})

  if (newDoc.roles[0] != newDoc.account._id)
    throw({forbidden:'user.roles[0] must match user.account.id. Got '+toJSON(newDoc)})

  if (newDoc.roles[1] != 'user')
    throw({forbidden:'user.roles[1] must be "user". Got '+toJSON(newDoc)})

  if ( ! oldDoc) return //Rest of rules are only for editing existing users

  if (newDoc.account._id != userCtx.roles[0])
    throw({unauthorized:'Only users within an account may edit one another. Your account is '+userCtx.roles[0]});
}

exports.proxy = function* () {
  yield this.http(this.url.replace('/users', '/_users'), true).headers(authorize)
}

//TODO only show users of current account
//TODO reuse code from index.js
exports.list = function* () {
  yield this.http.get(`/_users/_design/auth/_list/all/authorized?include_docs=true&key="${this.account}"`, true)
}

exports.doc = function* (id) { //TODO only edit, get, delete users of current account
  yield this.http(this.url.replace('/users', '/_users'), true)
}

//CouchDB requires an _id based on the user's name
exports.post = function* () {
  this.body = yield this.http.body

  this.body.createdAt = new Date().toJSON()
  this.body.account   = body.account || this.account
  this.body.type      = 'user'
  this.body.roles     = ['user']

  let res = yield this.http.put('_users/org.couchdb.user:'+this.body.name).headers(authorize).body(this.body)

  this.status = res.status

  if (this.status != 201)
    return this.body = res.body

  this.body._id  = res.body.id
  this.body._rev = res.body.rev
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
