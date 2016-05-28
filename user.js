"use strict"
let secret = require('../development')
let authorization = 'Basic '+new Buffer(secret.username+':'+secret.password).toString('base64')

exports.validate_doc_update = function(newDoc, oldDoc, userCtx) {

  if (newDoc._id.slice(0, 7) == '_local/') return
  if (newDoc._deleted) return

  var id = /^[a-z0-9]{7}$/

  ensure.prefix = 'user'

  ensure('type').notChanged
  ensure('account._id').notChanged
  ensure('roles').notChanged
  ensure('password').notChanged

  ensure('email').notNull.regex(/\w{2,}@\w{3,}\.(com|org|net|gov)/).notChanged
  ensure('createdAt').notNull.isDate.notChanged
  ensure('name.first').notNull.isString
  ensure('name.last').notNull.isString
  ensure('phone').notNull.regex(/\d{3}\.\d{3}\.\d{4}/)
}
//Note ./startup.js saves views,filters,and shows as toString into couchdb and then replaces
//them with a function that takes a key and returns the couchdb url needed to call them.
exports.filter = {
  authorized(doc, req) {
    if (doc._id.slice(0, 7) == '_design') return
    if (doc._deleted) return true

    return doc.account._id == req.userCtx.roles[0] //Only see users within your account
  }
}

exports.show = {
  authorized(doc, req) {
    if ( ! doc) return {code:404}

    if (doc.account._id == req.userCtx.roles[0]  )
      return toJSON(req.query.open_revs ? [{ok:doc}]: doc)

    return {code:401}
  }
}

exports.view = {
  authorized(doc) {
    emit(doc.account._id, {rev:doc._rev})
  },
  email(doc) { //for session login
    emit(doc.email)
  }
}

exports.changes = function* (db) {
  yield this.http(exports.filter.authorized(this.url), true)
}


//TODO get rid of id in path and use query string instead.  Paths would be

//CRUD Enpoints (common accross resources)
// GET    users?selector={"email":"adam@sirum.org"} || users?selector={"_id":"abcdef"} || selector={"name.first":"adam"}
// POST   users
// PUT    users {_id:abcdef, _rev:abcdef}
// DELETE users {_id:abcdef, _rev:abcdef}

//Custom endpoints (specific to this resource)
// POST   users/session        {email:adam@sirum.org, password}
// POST   users/email          {email:adam@sirum.org, subject, message, attachment}

//Replication Endpoints (for pouchdb, begin with underscore)
// POST   users/_bulk_get
// POST   users/_bulk_docs
// POST   users/_all_docs
// POST   users/_revs_diff
// POST   users/_changes

//Client
//this.db.users.get({email:adam@sirum.org})
//this.db.users.post({})
//this.db.users.put({})
//this.db.users.delete({})
//this.db.users.session.post({})
//this.db.users.email.post({})


//TODO switch this to using email once bulk_get is working
exports.get = function* () {

  let selector = JSON.parse(this.query.selector)

  if (selector.email)
    yield this.http(exports.view.email(selector.email), true)

  if ( ! selector._id) return //TODO other search types

  yield this.http(exports.show.authorized(selector._id), true)

  //show function cannot handle _deleted docs with open_revs, so handle manually here
  if (this.status == 404 && this.query.open_revs)
    yield this.http.get(this.path+'/'+selector._id, true)
}

exports.bulk_get = function* () {
  this.status = 400
}

//CouchDB requires an _id based on the user's name
exports.post = function* () {
  this.body  = yield this.http.body
  let id     = this.http.id
  let res    = yield this.http
  .put('_users/org.couchdb.user:'+id).headers({authorization})
  .body({
    name:id,
    type:'user',
    roles:[this.body.account._id],
    password:this.body.password
  })

  this.status = res.status

  if (this.status != 201)
    return this.body = res.body

  this.body.createdAt = new Date().toJSON()
  this.body.password  = undefined

  res = yield this.http.put('user/'+id).body(this.body)

  this.status = res.status

  if (this.status != 201)
    return this.body = res.body

  this.body._id  = res.body.id
  this.body._rev = res.body.rev
}

//TODO switch this to using email once bulk_get is working
//TODO use an id?  Rely on _id being embedded? Maybe make PUTs default behavior to be PATCH?
exports.put = function* () {
  yield this.http(this.url, true)
}

exports.bulk_docs = function* () {
  yield this.http(this.url, true)
}

exports.delete = function* () {
  yield this.http(this.url, true)
  yield this.http(this.url.replace('user', '_users'), true)
}

exports.email = function* () {
  this.status = 501 //not implemented
}

//TODO consider putting account's State as user role
exports.session = {
  *post() {

    let login = yield this.http.body

    let user = yield this.http.get(exports.view.email(login.email))

    if ( ! user.body.length) {
      this.status = 404
      this.message = 'No user exists with that email'
      return
    }

    user = user.body[0] //assume just one user per email for now

    yield this.http('_session', true).headers(this.headers).body({name:user._id, password:login.password})

    if (this.status != 200) return
    this.body = {_id:user._id, account:{_id:user.account._id}}
    this.cookies.set('AuthUser', JSON.stringify(this.body), {httpOnly:false})
  },

  *delete() {
    yield this.http('_session', true)
    //This has to be set after the proxy since proxy will overwrite our cookie
    this.cookies.set('AuthUser', '')
  }
}
