"use strict"

exports.post = function* () {
  yield this.couch
  .put({proxy:true})
  .url('accounts/'+couch.id())
  .body(body => {
    delete body._rev
    body.createdAt  = new Date().toJSON()
    body.authorized = body.authorized || []
    return body
  })
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
    let path = '/accounts/'+this.cookies.get('AuthAccount')

    let account = yield this.couch.get().url(path)

    if ( ~ account.authorized.indexOf(id)) {
      this.status  = 409
      this.message = 'This account is already authorized'
    }
    else {
      account.authorized.push(id)
      yield this.couch.put({proxy:true}).url(path).body(account)
    }
  },
  *delete(id) {
    //Un-authorize a sender
    let path    = '/accounts/'+this.cookies.get('AuthAccount')
    let account = yield this.couch.get().url(path)
    let index   = account.authorized.indexOf(id)

    if (index == -1) {
      this.status  = 409
      this.message = 'This account is already not authorized'
    }
    else {
      account.authorized.splice(index, 1);
      yield this.couch.put({proxy:true}).url(path).body(account)
    }
  }
}
