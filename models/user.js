"use strict"

//defaults
module.exports = exports = Object.create(require('../helpers/model'))

let admin = {ajax:{auth:require('../../../keys/dev')}}
let csv = require('csv/server')

exports.views = {
  'account._id':function(doc) {
    emit(doc.account._id)
  }
}

exports.get_csv = async function (ctx, db) {
  const opts = {startkey:ctx.account._id, endkey:ctx.account._id+'\uffff', include_docs:true}
  let view = await ctx.db.user.query('account._id', opts)
  ctx.body = csv.fromJSON(view.rows)
  ctx.type = 'text/csv'
}

//Server-side validation methods to supplement shared ones.
exports.validate = function(model) {
  return model
    .ensure('account._id').custom(authorized).withMessage('You are not authorized to modify this user')
    .ensure('_rev').custom(saveLogin).withMessage('Could not save new user login information')
    .ensure('_deleted').custom(deleteLogin).withMessage('Could not delete user login information')
}

//Context-specific - options MUST have 'this' property in order to work.
function authorized(doc, opts) {

  if (opts.ctx.account._id) {
    console.log('Matching user ctx.account._id with doc.account._id', doc.account._id, opts.ctx.account._id)
    return doc.account._id == opts.ctx.account._id
  }

  if (exports.isNew(doc, opts)) {
    console.log('user is new')
    return true //enable user to be created even though current user doesn't exist and therefor doesn't have allAccounts role
  }

  return false
}

//Context-specific - options MUST have 'this' property in order to work.
function deleteLogin(doc, opts) {
  return opts.ctx.db._users.delete('org.couchdb.user:'+doc.phone, doc._rev, admin)
}

function saveLogin(doc, opts) {
  //Check for doc.password just in case we are trying to recreate an existing user
  if (doc.password) {
    //User ._id not .phone since _id has had all extraneous characters removed
    let _user = {name:doc._id, password:doc.password, roles:['allAccounts', doc.account._id]}
    console.log('saveLogin'),
    console.log('_user', _user)
    console.log('doc', doc)
    console.log('admin', admin)
    console.log('account', opts.ctx && opts.ctx.account)
    console.log('cookie before', opts.ctx && opts.ctx.cookies.get('AuthSession'))
    console.log('headers before', opts.ctx && opts.ctx.headers)

    delete doc.password //we don't want to save this in the user table

    opts.ctx && opts.ctx.cookies.set('AuthSession', {overwrite:true})
    console.log('cookie 1', opts.ctx && opts.ctx.cookies.get('AuthSession'))

    opts.ctx && opts.ctx.cookies.set('AuthSession', null, {overwrite:true})
    console.log('cookie 2', opts.ctx && opts.ctx.cookies.get('AuthSession'))

    opts.ctx && (opts.ctx.request.headers.cookie = '');
    console.log('cookie 3', opts.ctx && opts.ctx.cookies.get('AuthSession'))

    delete opts.ctx.request.headers.cookie;
    console.log('cookie 4', opts.ctx && opts.ctx.cookies.get('AuthSession'))

    delete opts.ctx.req.headers.cookie;
    console.log('cookie 5', opts.ctx && opts.ctx.cookies.get('AuthSession'))

    console.log('cookie after', opts.ctx && opts.ctx.cookies.get('AuthSession'))
    console.log('headers after', opts.ctx && opts.ctx.headers)

    return opts.ctx.db._users.put(_user, {ajax:admin.ajax}).catch(err => console.log('new session err', err))
  }

  console.log('saveLogin doc.password not set')

  return true
}

function session(ctx, _user) {
  const body = {name:_user.name, password:_user.password} //including roles with cause a couchdb badarg err
  return ctx.ajax({url:'/_session', method:'post', body}).then(res => {
    console.log('body', res.body, res.status)
    //ctx.status = 201
    if (res.status !== 200)
      ctx.throw(res.status, res.body)//401 status should not log us in

    ctx.set(res.headers)
    const cookie = JSON.stringify({_id:res.body.name, account:{_id:res.body.roles[1]}})
    ctx.cookies.set('AuthUser', cookie, {httpOnly:false})
    return cookie
  })
}

async function session(ctx, _user) {

  const body = {name:_user.name, password:_user.password} //including roles with cause a couchdb badarg err

  const res = await ctx.ajax({url:'/_session', method:'post', body})

  console.log('body', res.body, res.status)
  //ctx.status = 201
  if (res.status !== 200)
    ctx.throw(res.status, res.body)//401 status should not log us in

  ctx.set(res.headers)

  const cookie = JSON.stringify({_id:res.body.name, account:{_id:res.body.roles[1]}})

  ctx.cookies.set('AuthUser', cookie, {httpOnly:false})

  return cookie
}

exports.session = {
  async post(ctx) {

    const _user = {
      name:ctx.req.body.phone.replace(/[^\d]/g, ''),
      password:ctx.req.body.password
    }
    const user = await ctx.db.user.get(_user.name)

    user.error
      ? ctx.throw(404, 'No user exists with the phone '+_user.name)
      : ctx.body = await session(ctx, _user)

      console.log('ctx.body', ctx.body)
  },

  async delete(ctx) {
    console.log('user.session.delete')
    let res = await ctx.ajax({url:'/_session',  method:'delete'})
    ctx.status = res.status
    ctx.body   = res.body
    console.log('user.session.delete', ctx.body)
    ctx.cookies.set('AuthUser', '') //This has to be set after the proxy since proxy will overwrite our cookie
  }
}
