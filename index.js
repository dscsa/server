"use strict"

let fs      = require('fs')
let app     = require('koa')()
let body    = require('./helpers/body')
let keys    = require('./helpers/keys')
let r       = require('./helpers/router')(app)
let ajax    = require('./helpers/ajax')
let pouchdb = require('../pouch/pouchdb-server')
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

  //app.use(body({multipart:true}))
  //Parse our manual cookie so we know account _ids without relying on couchdb
  //Collect the request body so that we can use it with pouch
  app.use(function*(next) {



    this.db   = pouchdb
    this.ajax = ajax({baseUrl:'http://localhost:5984'})

    //return this.ajax({url:'http://data.medicaid.gov/resource/tau9-gfwr.json?$where=as_of_date%3E%222017-06-02T22:49:03.681%22%20AND%20ndc_description%20like%20%22MEMA%2510%25%22'})


    //Sugar  //Rather setting up CouchDB for CORS, it's easier & more secure to do here
    this.set('access-control-allow-origin', this.headers.origin || this.headers.host)
    this.set('access-control-allow-headers', 'accept, accept-encoding, accept-language, cache-control, connection, if-none-match, authorization, content-type, host, origin, pragma, referer, x-csrf-token, user-agent')
    this.set('access-control-allow-methods', 'GET, POST, OPTIONS, PUT, DELETE')
    this.set('access-control-allow-credentials', true)
    //this.set('access-control-max-age', 1728000)

    if (this.method == 'OPTIONS')
      return this.status = 204

    let cookie  = JSON.parse(this.cookies.get('AuthUser') || 'null')

    this.user    = {_id:cookie && cookie._id}
    this.account = {_id:cookie && cookie.account._id}

    yield body(this.req)
    yield next

    this.set('access-control-expose-headers', 'cache-control, content-length, content-type, date, etag, location, server, transfer-encoding')
    this.set('transfer-encoding', 'chunked') //This was sometimes causing errors when Jess/Adam logged in with a PC ERR: Content Length Mismatch
  })

  app.use(function *(next) {
    try {
      yield next
    } catch (err) {
      console.log('server error:', this.path, err)
      //Handle three types of errors
      //1) actual coding errors, which will be instanceof Error
      //2) this.throw() errors from my code which will be instanceof Error
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

      err.request = this.req.body
      this.message = err.error+': '+err.reason
      this.status = err.status || 500 //koa's this.throw sets err.status
      this.body   = err
    }
  })

  //
  //CouchDB/PouchDB Replication API
  //

  r('/')
    .get(function*() {
      if(this.headers.origin || this.headers.referer) //Not sure why pouchdb checks this.  Shows welcome UUID & Version
        return yield proxy.call(this)

      yield get_asset.call(this)
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

  r('/account/authorized')     //Allow user to get, modify, & delete docs
    .get(models.account.authorized.get)
    .post(models.account.authorized.post)
    .del(models.account.authorized.delete)

  r('/transaction/:id/history')
    .get(models.transaction.history)

  r('/account/:id/inventory.csv')     //Allow user to get, modify, & delete docs
    .get(models.account.inventory)

  r('/account/:id/record.csv')     //Allow user to get, modify, & delete docs
    .get(models.account.record)

  r('/account/:id/metrics.csv')     //Allow user to get, modify, & delete docs
    .get(models.account.metrics)

  r('/account/:id/users.csv')     //Allow user to get, modify, & delete docs
    .get(models.account.users)

  r('/:model/:id')
    .get(function*(db, id) {
      this.query.selector = `{"id":"${id}"}`
      yield model('get').call(this, db)
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

  //all(/on?deep.field=this&this.must.be.true.to.trigger=true)
  //all(/on?deep.field=this)
  //all(/event)

  app.listen(80); console.log('listening on port 80')

  //
  // Hoisted Helper Functions
  //

  function* adminProxy(db) {
    this.req.auth = require('../../keys/dev')
    return yield proxy.call(this, db)
  }

  function* proxy(db) {

    if (db && ! models[db])
      return this.status = 404

    if (this.query.timeout) //honor the 25 sec timeout
      this.req.timeout = this.query.timeout //this is not actually a node thing, just a flag for pouchdb-server.ajax

    //ajax returns a stream that koa can handle
    this.body = this.ajax(this.req)
  }

  function model(method) {
    return function*(db) {
      if ( ! models[db])
        return this.status = 404

      yield models[db][method].apply(this, arguments)
    }
  }

  function* get_asset(asset) {

    asset = asset ? this.path : '/client/src/views/index.html'

    this.type = asset.split('.').pop()
    this.body = fs.createReadStream(__dirname+'/..'+asset)
  }
})
