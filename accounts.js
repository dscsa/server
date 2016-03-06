var couch = require('./couch')

exports.list  = couch.list
exports.doc   = couch.doc
exports.post = function* () {
  yield couch(this, 'PUT')
  .path('/'+couch.id(), true)
  .body({
    authorized:[],
    createdAt:new Date().toJSON(),
    _rev:undefined
  }, true)
}
exports.email = function* (id) {
  this.status = 501 //not implemented
}
exports.authorized = {
  *get(id) {
    //Search for all accounts (recipients) that have authorized this account as a sender
    //shortcut to /accounts?selector={"authorized":{"$elemMatch":"${session.account}"}}
    this.status = 501 //not implemented
  },
  *post(id) {
    //Authorize a sender
    var path = '/accounts/'+this.cookies.get('AuthAccount')

    var account = yield couch(this,'GET').path(path).proxy(false)

    if ( ~ account.authorized.indexOf(id)) {
      this.status  = 409
      this.message = 'This account is already authorized'
    }
    else {
      account.authorized.push(id)
      yield couch(this,'PUT').path(path).body(account)
    }
  },
  *delete(id) {  //Un-authorize a sender
    //Authorize a sender
    var path = '/accounts/'+this.cookies.get('AuthAccount')

    var account = yield couch(this,'GET').path(path).proxy(false)
    var index   = account.authorized.indexOf(id)

    if (index == -1) {
      this.status  = 409
      this.message = 'This account is already not authorized'
    }
    else {
      account.authorized.splice(index, 1);
      yield couch(this,'PUT').path(path).body(account)
    }
  }
}
