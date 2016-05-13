"use strict"

exports.validate_doc_update = function(newDoc, oldDoc, userCtx) {
  
  if (newDoc._id.slice(0, 7) == '_local/')
    return

  if ( ! isArray(newDoc.authorized))
    throw({forbidden:'account.authorized must be an array. Got '+toJSON(newDoc)})

  if (oldDoc && newDoc._id != userCtx.roles[0])
    throw({unauthorized:"User's may only edit their own account. Your account is "+userCtx.roles[0]+". Got "+toJSON(newDoc)});
}
exports.post = function* () {
  this.body            = yield this.http.body
  this.body.createdAt  = new Date().toJSON()
  this.body.authorized = body.authorized || []
  delete this.body._rev

  let res = yield this.http.put('accounts/'+this.couch.id).body(this.body)

  this.status = res.status

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
    let path    = 'accounts/'+this.account
    let account = yield this.http.get(path)

    if (account.body.authorized.includes(id)) {
      this.status  = 409
      this.message = 'This account is already authorized'
    } else {
      account.body.authorized.push(id)
      yield this.http.put(path, true).body(account.body)
    }
  },
  *delete(id) {
    //Un-authorize a sender
    let path    = 'accounts/'+this.account
    let account = yield this.http.get(path)
    let index   = account.body.authorized.indexOf(id)

    if (index == -1) {
      this.status  = 409
      this.message = 'This account is already not authorized'
    } else {
      account.body.authorized.splice(index, 1);
      yield this.http.put(path, true).body(account.body)
    }
  }
}
