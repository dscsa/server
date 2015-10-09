var couch = require('./couch')
var auth  = 'Basic '+new Buffer('<<your db username>>:<<your db password>>').toString('base64')

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

exports.list = function* () {
  yield couch.list.call(this)   //TODO only show users of current account
}

exports.doc = function* () {
  yield couch.doc.call(this)   //TODO only edit, get, delete users of current account
}

//CouchDB requires an _id based on the user's name
exports.post = function* () {
  authorize(this.req.headers)
  this.req.body = yield couch.json(this.req)
  if ( ! this.req.body.account) {
    this.status = 422
    this.message = 'user must have an account property'
  }
  else {
    this.body._id       = 'org.couchdb.user:'+this.req.body.name
    this.body.type      = 'user'
    this.body.roles     = ['user']
    yield couch.post.call(this)   //TODO only edit, get, delete users of current account
  }
}

exports.email = function* (id) {
  this.status = 501 //not implemented
}

exports.session = {
  *post(id) {
    yield couch(this)
    .path('/_session')
    .headers({'referer':'http://'+this.headers['host']}, true)
    .body({name:id}, true)

    this.body = yield couch(this, 'GET')
    .path('/users/org.couchdb.user:'+id)
    .proxy(false)

    this.cookies.set('AuthAccount', this.body.account)
    delete this.body.roles
  },

  *delete(id) {
    this.cookies.set('AuthAccount', '')
    yield couch(this).path('/_session')
  }
}
