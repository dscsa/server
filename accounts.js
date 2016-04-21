"use strict"

exports.post = function* () {
  let res = yield this.couch.put()
  .url('accounts/'+couch.id())
  .body(body => {
    delete body._rev
    body.createdAt  = new Date().toJSON()
    body.authorized = body.authorized || []
    this.body = body
  })
  this.status    = res.status

  if (this.status != 201)
    return this.body = res.body

  this.body._id  = res.body.id
  this.body._rev = res.body.rev
}

//TODO need to update shipments account.from/to.name on change of account name

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
    let path = '/accounts/'+this.account

    let account = yield this.couch.get().url(path)

    if ( ~ account.body.authorized.indexOf(id)) {
      this.status  = 409
      this.message = 'This account is already authorized'
    }
    else {
      account.body.authorized.push(id)
      yield this.couch.put({proxy:true}).url(path).body(account.body)
    }
  },
  *delete(id) {
    //Un-authorize a sender
    let url     = '/accounts/'+this.account
    let account = yield this.couch.get().url(url)
    let index   = account.body.authorized.indexOf(id)

    if (index == -1) {
      this.status  = 409
      this.message = 'This account is already not authorized'
    }
    else {
      account.body.authorized.splice(index, 1);
      yield this.couch.put({proxy:true}).url(url).body(account.body)
    }
  }
}
