"use strict"

let secret = require('../development')
let auth   = 'Basic '+new Buffer(secret.username+':'+secret.password).toString('base64')

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

exports.proxy = function* () {
  yield this.couch({proxy:true}).headers(authorize).url(this.url.replace('/users', '/_users'))
}

//TODO only show users of current account
//TODO reuse code from index.js
exports.list = function* () {
  yield this.couch
  .get({proxy:true})
  //.headers(authorize)
  .url(`/_users/_design/auth/_list/all/authorized?include_docs=true&key="${this.account}"`)
}

exports.doc = function* (id) { //TODO only edit, get, delete users of current account
  yield this.couch({proxy:true})
  //.headers(authorize)
  .url(this.url.replace('/users', '/_users'))
}

//CouchDB requires an _id based on the user's name
exports.post = function* () {
  yield this.couch.put({proxy:true})
  .headers(authorize)
  .url(body => '/_users/org.couchdb.user:'+body.name)
  .body(body => {
    body.createdAt = new Date().toJSON()
    body.account = body.account || this.account
    body.type  = 'user'
    body.roles = ['user']
  })
}

exports.email = function* (id) {
  this.status = 501 //not implemented
}

exports.session = {
  *post(id) {
    yield this.couch({proxy:true})
    .url('/_session')
    .headers(headers => { headers.referer = 'http://'+headers.host })
    .body(body => { body.name = id })

    let user    = yield this.couch.get().url('/_users/org.couchdb.user:'+id)
    let account = yield this.couch.get().url('/accounts/'+user.body.account._id)

    user.body.account = account.body

    this.cookies.set('AuthAccount', user.body.account._id)

    delete user.body.roles
    delete user.body.type
    this.body = user.body
  },

  *delete(id) {
    this.cookies.set('AuthAccount', '')
    yield this.couch({proxy:true}).url('/_session')
  }
}
