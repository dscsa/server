"use strict"
let secret = require('../../keys/dev')
let authorization = 'Basic '+new Buffer(secret.username+':'+secret.password).toString('base64')

exports.lib = {}

exports.getRoles = function(doc, reduce) {
  //Authorize _deleted docs but not _design docs
  if (doc._deleted || doc._id.slice(0, 7) == '_design')
    return doc._deleted

  //Only users can access their account
  return reduce(null, doc.account._id)
}

//Must account for deleted, design, and regular
exports.docRoles = function(doc, emit) {
  //Determine whether user is authorized to see the doc
  emit(doc.account._id)
}

exports.userRoles = (ctx, emit) => {
  ctx.session && emit(ctx.session.account._id)
}

exports.validate = function(newDoc, oldDoc, userCtx) {

  var id = /^[a-z0-9]{7}$/
  var ensure = require('ensure')('user', arguments)

  if ( ! userCtx.roles.length)
    return 'You must be logged in to save a user'

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
  }
}

//TODO switch this to using email once bulk_get is working
exports.get = function* () {
  let s = JSON.parse(this.query.selector)

  //TODO remove this once bulk_get is supported and we no longer need to handle replication through regular get
  if (s._id)
    return yield this.query.open_revs
      ? this.http.get('user/'+s._id)
      : this.db.user.list.id(s._id)
}

//CouchDB requires an _id based on the user's name
exports.post = function* () {
  let name = this.http.id
  let doc  = yield this.http.body

  let _user = {
    name,
    type:'user',
    roles:[doc.account._id],
    password:doc.password
  }

  //We don't need the body here but want to trigger an error if anything but 201 created
  yield this.http.put('_users/org.couchdb.user:'+name, _user).headers({authorization}).body

  doc.createdAt = new Date().toJSON()
  doc.password  = undefined

  let save = yield this.http.put('user/'+name, doc).body

  doc._id  = save.id
  doc._rev = save.rev
  this.body = doc
}

//TODO switch this to using email once bulk_get is working
//TODO use an id?  Rely on _id being embedded? Maybe make PUTs default behavior to be PATCH?
exports.put = function* () {
  yield this.http()
}

exports.bulk_docs = function* () {
  let body = yield this.http.body
  for (let doc of body.docs)
    if (doc._deleted) {
      let url   = '_users/org.couchdb.user:'+doc._id
      let user  = yield this.http.get(url).headers({authorization}).body
      this.body = yield this.http.delete(url+'?rev='+user._rev, user).headers({authorization}).body //set _rev in url since _rev within body still triggered 409 conflict
    }

  yield this.http(null, body)
}

exports.delete = function* () {
  yield this.http()
  yield this.http(this.path.replace('user', '_users')).headers({authorization})

}

exports.email = function* () {
  this.status = 501 //not implemented
}

//TODO consider putting account's State as user role
exports.session = {
  *post() {
    let login = yield this.http.body
    let users = yield this.db.user.list.email(login.email).body //assume just one user per email for now
    if ( ! users[0])
      this.throw(404, 'No user exists with the email '+login.email)

    yield this.http('_session', {name:users[0]._id, password:login.password}) //.headers(this.headers)

    this.body = {_id:users[0]._id, account:{_id:users[0].account._id}}
    this.cookies.set('AuthUser', JSON.stringify(this.body), {httpOnly:false})
  },

  *delete() {
    yield this.http('_session')
    this.cookies.set('AuthUser', '') //This has to be set after the proxy since proxy will overwrite our cookie
  }
}
