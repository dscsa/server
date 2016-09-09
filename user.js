"use strict"
let secret = require('../../keys/dev')
let authorization = 'Basic '+new Buffer(secret.username+':'+secret.password).toString('base64')

exports.libs = {}

exports.getRoles = function(doc, reduce) {
  //Authorize _deleted docs but not _design docs
  if (doc._deleted || doc._id.slice(0, 7) == '_design')
    return doc._deleted

  //Only users can access their account
  return reduce(null, doc.account._id)
}

exports.validate = function(newDoc, oldDoc, userCtx) {

  var id = /^[a-z0-9]{7}$/
  var ensure = require('ensure')('user', arguments)

  //Required
  ensure('_id').notNull.regex(id)
  ensure('email').notNull.regex(/[\w._]{2,}@\w{3,}\.(com|org|net|gov)/)
  ensure('createdAt').notNull.isDate.notChanged
  ensure('name.first').notNull.isString
  ensure('name.last').notNull.isString
  ensure('phone').notNull.regex(/\d{3}\.\d{3}\.\d{4}/)

  //Optional
  ensure('type').notChanged
  ensure('account._id').notChanged
  ensure('roles').notChanged
  ensure('password').notChanged
}

var view = exports.view = {
  email(doc) { //for session login
    emit(doc.email)
  },
  id(doc) { //Right now this should emit everything but getRoles could change
    require('getRoles')(doc, function(res, role) {
      emit([role, doc._id], {rev:doc._rev})
    })
  }
}

//TODO switch this to using email once bulk_get is working
exports.get = function* () {
  let url, selector = JSON.parse(this.query.selector)

  //TODO remove this once bulk_get is supported and we no longer need to handle replication through regular get
  if (selector._id)
    url = this.query.open_revs ? 'user/'+selector._id : view.id([this.user.account._id, selector._id])

  if (url)
    yield this.http.get(url, true)
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
    let user  = yield this.http.get(view.email(login.email))
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
