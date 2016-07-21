"use strict"
let secret = require('../../keys/dev')
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

  ensure('email').notNull.regex(/[\w._]{2,}@\w{3,}\.(com|org|net|gov)/)
  ensure('createdAt').notNull.isDate.notChanged
  ensure('name.first').notNull.isString
  ensure('name.last').notNull.isString
  ensure('phone').notNull.regex(/\d{3}\.\d{3}\.\d{4}/)
}
//Note ./startup.js saves views,filters,and shows as toString into couchdb and then replaces
//them with a function that takes a key and returns the couchdb url needed to call them.
exports.filter = {
  authorized(doc, req) {
    if ( ! doc.account) return doc._deleted //true for _deleted false for _design

    return doc.account._id == req.userCtx.roles[0] //Only see users within your account
  }
}

exports.show = {
  authorized(doc, req) {
    if ( ! doc) return {code:204}

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
  yield this.http(exports.filter.authorized(this.path), true)
}

//TODO switch this to using email once bulk_get is working
exports.get = function* () {

  let selector = JSON.parse(this.query.selector)

  if (selector.email)
    return yield this.http(exports.view.email(selector.email), true)

  if ( ! selector._id) return //TODO other search types

  yield this.http(exports.show.authorized(selector._id), true)

  //show function cannot handle _deleted docs with open_revs, so handle manually here
  if (this.status == 204 && this.query.open_revs)
    yield this.http.get(this.path+'/'+selector._id, true)
}

exports.bulk_get = function* () {
  this.status = 400
}

//CouchDB requires an _id based on the user's name
exports.post = function* () {
  let name = this.http.id
  let user = yield this.http.body
  let save = yield this.http.put('_users/org.couchdb.user:'+name).headers({authorization}).body({
    name,
    type:'user',
    roles:[user.account._id],
    password:user.password
  })

  user.createdAt = new Date().toJSON()
  user.password  = undefined

  save = yield this.http.put('user/'+name).body(user)

  user._id  = save.id
  user._rev = save.rev
  this.body = user
}

//TODO switch this to using email once bulk_get is working
//TODO use an id?  Rely on _id being embedded? Maybe make PUTs default behavior to be PATCH?
exports.put = function* () {
  yield this.http(this.path, true)
}

exports.bulk_docs = function* () {
  let body = yield this.http.body

  for (let doc of body.docs)
    if (doc._deleted) {
      let url  = '_users/org.couchdb.user:'+doc._id
      let user = yield this.http.get(url).headers({authorization})
      this.body = yield this.http.delete(url+'?rev='+user._rev).headers({authorization}).body(user) //set _rev in url since _rev within body still triggered 409 conflict
    }

  yield this.http(this.path, true).body(body)
}

exports.delete = function* () {
  yield this.http(this.path, true)
  yield this.http(this.path.replace('user', '_users'), true).headers({authorization})
}

exports.email = function* () {
  this.status = 501 //not implemented
}

//TODO consider putting account's State as user role
exports.session = {
  *post() {
    let login = yield this.http.body
    let user  = yield this.http.get(exports.view.email(login.email))
    user = user[0] //assume just one user per email for now

    if ( ! user)
      this.throw(404, 'No user exists with the email '+login.email)

    yield this.http('_session', true).headers(this.headers).body({name:user._id, password:login.password})

    this.body = {_id:user._id, account:{_id:user.account._id}}
    this.cookies.set('AuthUser', JSON.stringify(this.body), {httpOnly:false})
  },

  *delete() {
    yield this.http('_session', true)
    this.cookies.set('AuthUser', '') //This has to be set after the proxy since proxy will overwrite our cookie
  }
}
