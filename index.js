"use strict"

let fs      = require('fs')
let app     = require('koa')
app         = new app()
let body    = require('./helpers/body')
let keys    = require('./helpers/keys')
let r       = require('./helpers/router')(app)
let ajax    = require('./helpers/ajax')
let models  = {
  drug        : require('./models/drug'),
  account     : require('./models/account'),
  user        : require('./models/user'),
  shipment    : require('./models/shipment'),
  transaction : require('./models/transaction'),
}

process.on('unhandledRejection', (reason, promise) => {
  console.log('unhandledRejection', reason instanceof Buffer ? reason.toString() : reason)
  if (promise.then)
    promise.then(err => console.log('unhandledRejection promise.then', err instanceof Buffer ? err.toString() : err)).catch(err => console.log('unhandledRejection promise.catch', err instanceof Buffer ? err.toString() : err))
})

keys(function() {

  let pouchdb = require('../pouch/pouchdb-server')

  //app.use(body({multipart:true}))
  //Parse our manual cookie so we know account _ids without relying on couchdb
  //Collect the request body so that we can use it with pouch
  app.use(async function(ctx, next) {

    ctx.db   = pouchdb
    ctx.ajax = ajax({baseUrl:'http://localhost:5984'})

    //return ctx.ajax({url:'http://data.medicaid.gov/resource/tau9-gfwr.json?$where=as_of_date%3E%222017-06-02T22:49:03.681%22%20AND%20ndc_description%20like%20%22MEMA%2510%25%22'})

    //Sugar  //Rather setting up CouchDB for CORS, it's easier & more secure to do here
    ctx.set('access-control-allow-origin', ctx.headers.origin || ctx.headers.host)
    ctx.set('access-control-allow-headers', 'accept, accept-encoding, accept-language, cache-control, connection, if-none-match, authorization, content-type, host, origin, pragma, referer, x-csrf-token, user-agent')
    ctx.set('access-control-allow-methods', 'GET, POST, OPTIONS, PUT, DELETE')
    ctx.set('access-control-allow-credentials', true)
    //ctx.set('access-control-max-age', 1728000)

    if (ctx.method == 'OPTIONS')
      return ctx.status = 204

    let cookie  = JSON.parse(ctx.cookies.get('AuthUser') || 'null')

    ctx.user    = {_id:cookie && cookie._id}
    ctx.account = {_id:cookie && cookie.account._id}

    await body(ctx.req)
    await next()

    ctx.set('access-control-expose-headers', 'cache-control, content-length, content-type, date, etag, location, server, transfer-encoding')
    ctx.set('transfer-encoding', 'chunked') //This was sometimes causing errors when Jess/Adam logged in with a PC ERR: Content Length Mismatch
  })

  app.use(async function(ctx, next) {
    try {
      await next()
    } catch (err) {
      console.log('server error:', ctx.path, err)
      //Handle three types of errors
      //1) actual coding errors, which will be instanceof Error
      //2) ctx.throw() errors from my code which will be instanceof Error
      //3) http statusCodes <200 && >=300 in which we want to stop normal flow and proxy response to user
      //Server errors should mimic CouchDB errors as closely as possible
      if (err instanceof Error) {
        err = {
          error:err.name,
          reason:err.message,
          status:err.status,
          stack:err.stack.split && err.stack.split("\n")
        }
      }

      err.request = ctx.req.body
      ctx.message = err.error+': '+err.reason
      ctx.status = err.status || 500 //koa's ctx.throw sets err.status
      ctx.body   = err
    }
  })

  //
  //CouchDB/PouchDB Replication API
  //

  r('/')
    .get(async function(ctx) {
      if(ctx.headers.origin || ctx.headers.referer) //Not sure why pouchdb checks ctx.  Shows welcome UUID & Version
        return await proxy(ctx)

      await get_asset(ctx)
    })

  //Serve the application and assets
  r('/client/:file', {end:false})
    .get(get_asset)

  r('/pouch/:file', {end:false})
    .get(get_asset)

  r('/csv/:file', {end:false})
    .get(get_asset)

  r('/favicon.ico', {end:false})
    .get(get_asset)

  r('/:model/', {strict:true}) //Shows DB info including update_seq#, needed for replication for new users
    .get(adminProxy)

  r('/:model/_revs_diff')      //Not sure why PouchDB needs this
    .post(adminProxy)

  r('/:model/_local/:doc')
    .get(adminProxy)
    .put(adminProxy)

  r('/:model/_local%2F:doc')
    .put(proxy)

  r('/:model/_design/:doc')
    .get(proxy)
    .put(proxy)

  r('/:model/_design/:ddoc/_view/:view')
    .get(proxy)

  r('/:model/_changes')      //Lets PouchDB watch db using longpolling
    .get(proxy)

  r('/:model/_all_docs')       //Needed if indexedDb cleared on browser
    .get(model('all_docs'))
    .post(model('all_docs'))

  r('/:model/_bulk_docs')    //Update denormalized transactions when drug is updated
    .post(model('bulk_docs'))

  r('/:model/_bulk_get')     //Allow PouchDB to make bulk edits
    .post(model('bulk_get'))

  //
  //User API Endpoints
  //

  r('/:model.csv')
    .get(model('get_csv'))
    .post(model('bulk_docs'))

  r('/:model', {strict:true})
    .get(model('get'))
    .post(model('post'))

  r('/user/session')
    .post(models.user.session.post)  //Login
    .del(models.user.session.delete) //Logout

  r('/transaction/:id/history')
    .get(models.transaction.history)

  r('/account/authorized')     //Allow user to get, modify, & delete docs
    .get(models.account.authorized.get)
    .post(models.account.authorized.post)
    .del(models.account.authorized.delete)

  r('/account/:id/pend/:name?')
    .post(models.account.pend.post)
    .del(models.account.pend.delete)

  r('/account/:id/dispense')
    .get(models.account.dispense)

  r('/account/:id/dispose')
    .get(models.account.dispose)

  r('/account/:id/inventory.csv')     //Allow user to get, modify, & delete docs
    .get(models.account.inventory)

  r('/account/:id/record-by-generic.csv')     //Allow user to get, modify, & delete docs
    .get(models.account.recordByGeneric)

  r('/account/:id/record-by-user.csv')     //Allow user to get, modify, & delete docs
    .get(models.account.recordByUser)

  r('/account/:id/record-by-from.csv')     //Allow user to get, modify, & delete docs
    .get(models.account.recordByFrom)

  r('/account/:id/binned.csv')     //Allow user to get, modify, & delete docs
    .get(models.account.binned)

  r('/:model/:id')
    .get(async function(ctx, db, id) {
      ctx.query.selector = `{"id":"${id}"}`
      await model('get')(ctx, db)
    })
    .put(model('put'))
    .del(model('del'))

  // r('/shipment/shipped')
  //   .post(models.shipment.shipped)         // TODO add shipped_at date and change status to shipped
  //
  // r('/shipment/received')
  //   .post(models.shipment.received)       // TODO add recieved_at date and change status to received
  //
  // r('/shipment/pickup')
  //   .post(models.shipment.pickup.post)      // add pickup_at date. Allow webhook filtering based on query string ?description=tracker.updated&result.status=delivered.
  //   .del(models.shipment.pickup.delete)     // delete pickup_at date
  //
  // r('/shipment/manifest')
  //   .get(models.shipment.manifest.get)    // pdf options?  if not exists then create, rather than an explicit POST method
  //   .del(models.shipment.manifest.delete) // delete an old manifest

  // r('/transaction/verified')
  //   .post(resources.transaction.verified.post)  //New transaction created in inventory, available for further transactions
  //   .del(resources.transaction.verified.delete) //New transaction removed from inventory, cannot be done if item has further transactions

  // r('/account/email')
  //   .post(models.account.email)                 //Allow user to get, modify, & delete docs
  //
  //
  // r('/user/email')
  //   .post(models.user.email)           //TODO only get, modify, & delete user for logged in account

  //all(/on?deep.field=this&ctx.must.be.true.to.trigger=true)
  //all(/on?deep.field=this)
  //all(/event)

  app.listen(80); console.log('listening on port 80')

  //
  // Hoisted Helper Functions
  //

  async function adminProxy(ctx, db) {
    ctx.req.auth = require('../../keys/dev')
    return await proxy(ctx, db)
  }

  async function proxy(ctx, db) {

    if (db && ! models[db])
      return ctx.status = 404

    if (ctx.query.timeout) //honor the 25 sec timeout
      ctx.req.timeout = ctx.query.timeout //this is not actually a node thing, just a flag for pouchdb-server.ajax

    //ajax returns a stream that koa can handle
    ctx.body = ctx.ajax(ctx.req)
  }

  function model(method) {
    return async function(ctx, db, ...args) {
      if ( ! models[db])
        return ctx.status = 404

      await models[db][method].apply(this, [ctx, db, ...args])
    }
  }

  async function get_asset(ctx, asset) {

    asset = asset ? ctx.path : '/client/src/views/index.html'

    ctx.type = asset.split('.').pop()
    ctx.body = fs.createReadStream(__dirname+'/..'+asset)
  }
})
