"use strict"

//defaults
module.exports = exports = Object.create(require('./model'))

let admin = {ajax:{auth:require('../../keys/dev')}}

exports.views = {
  'account._id':function(doc) {
    emit(doc.account._id)
  }
}

//Server-side validation methods to supplement shared ones.
exports.validate = function(model) {
  return model
    .ensure('account._id').custom(authorized).withMessage('You are not authorized to modify this user')
    .ensure('_rev').custom(saveLogin).withMessage('Could not save new user login information')
    .ensure('_deleted').custom(deleteLogin).withMessage('Could not delete user login information')
}

//Context-specific - options MUST have 'this' property in order to work.
function authorized(doc) {
  return doc._rev.split('-')[0] == 1 || doc.account._id == this.account._id
}

//Context-specific - options MUST have 'this' property in order to work.
function deleteLogin(doc) {
  return this.db._users.delete('org.couchdb.user:'+doc.phone, doc._rev, admin)
}

//Context-specific - options MUST have 'this' property in order to work.
//When creating user locally you don't know how long it will take to replicate
//to the server so you don't know when to POST user/session.  Save the hassle
//and when creating a user just log them in automatically
function saveLogin(doc, val, key, opts) {
  if ( ! doc._rev || (doc._rev.split('-')[0] == 1 && opts.new_edits === false)) {
    //User ._id not .phone since _id has had all extraneous characters removed
    let _user = {name:doc._id, password:doc.password, roles:[doc.account._id]}
    console.log('saveLogin', _user, doc)
    delete doc.password //we don't want to save this in the user table
    return this.db._users.put(_user, admin).then(_ => session.call(this, _user)).catch(err => console.log('new session err', err))
  }
  return true
}

function session(_user) {
  const body = {name:_user.name, password:_user.password} //including roles with cause a couchdb badarg err
  return this.ajax({url:'/_session', method:'post', body}).then(res => {
    console.log('body', body, res.statusCode, res.body)

    if (res.statusCode != 200)
      this.throw(res.statusCode, res.body)//401 status should not log us in

    //this.status = 201
    this.set(res.headers)
    const cookie = JSON.stringify({_id:res.body.name, account:{_id:res.body.roles[0]}})
    this.cookies.set('AuthUser', cookie, {httpOnly:false})
    return cookie
  })
}

exports.session = {
  *post() {

    const _user = {
      name:this.req.body.phone.replace(/[^\d]/g, ''),
      password:this.req.body.password
    }
    const user = yield this.db.user.get(_user.name)

    user
      ? this.body = yield session.call(this, _user)
      : this.throw(404, 'No user exists with the phone '+_user.name)

      console.log('this.body', this.body)
  },

  *delete() {
    console.log('user.session.delete')
    let res = yield this.ajax({url:'/_session',  method:'delete'})
    this.status = res.statusCode
    this.body   = res.body
    console.log('user.session.delete', this.body)
    this.cookies.set('AuthUser', '') //This has to be set after the proxy since proxy will overwrite our cookie
  }
}
