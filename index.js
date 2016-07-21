"use strict"

require('./startup')
let fs          = require('fs')
let extname     = require('path').extname
let app         = require('koa')()
let route       = require('koa-route')
let http        = require('./http')
let drug        = require('./drug')
let account     = require('./account')
let user        = require('./user')
let shipment    = require('./shipment')
let transaction = require('./transaction')
let project     = require('../client/aurelia_project/aurelia')
let assets      = project.build.targets[0].output

function r(url, options) {

  function router(method, handler) {
    app.use(route[method](url, wrapper, options))
    function *wrapper() {
      this.set('x-endpoint', method+' '+url+' for '+this.url)
      yield handler.apply(this, arguments)
    }
  }

  return {
    get(handler) {
      router('get', handler)
      return this
    },
    post(handler) {
      router('post', handler)
      return this
    },
    put(handler) {
      router('put', handler)
      return this
    },
    del(handler) {
      router('del', handler)
      return this
    },
    all(handler) {
      router('all', handler)
      return this
    }
  }
}

/*
//Resource Documentation Guide:
//End Point
//Request Headers
//Success Response Headers
//Error Response
//Methods
// -query string
// -request body
// -response body
// -example
*/

app.use(http({hostname:'localhost', port: 5984, middleware:'http'}))

function* proxy() {
  //console.log('proxy used for', this.url)
  yield this.http(this.url, true)
}

function* all_docs(db) {
  yield this.http(db+'/_design/auth/_view/authorized', true)
}

app.use(function* (next) {
  //Sugar
  this.user = JSON.parse(this.cookies.get('AuthUser') || 'null')

  //Rather setting up CouchDB for CORS, it's easier & more secure to do here
  this.set('access-control-allow-origin', this.headers.origin)
  this.set('access-control-allow-headers', 'accept, content-type')
  this.set('access-control-allow-methods', 'GET, POST, OPTIONS, PUT, DELETE')
  this.set('access-control-allow-credentials', true)
  this.set('access-control-max-age', 1728000)
  this.method == 'OPTIONS' ? this.status = 204 : yield next
})

app.use(function *(next) {
  try {
    yield next
  } catch (err) {
    this.body = err
    //Handle three types of errors
    //1 & 2) actual coding errors & this.throw() errors from my code.
    //2) couchdb errors thrown by http.js
    if (err instanceof Error) {
      this.status = err.status || 500
      this.body   = { //Mimic the a CouchDB error structure as closely as possible
        error:err.name,
        reason:err.message
      }
    }

    this.body.request = this.req.body && JSON.parse(this.req.body)
    this.body.stack   = err.stack.split("\n").slice(1) //don't repeat err.message on line 1 TODO:security
    this.body.status  = this.status
    this.message = this.body.error+': '+this.body.reason
  }
})

// CRUD Enpoints (common accross resources)
// GET    users?selector={"email":"adam@sirum.org"} || users?selector={"_id":"abcdef"} || selector={"name.first":"adam"}
// POST   users
// PUT    users {_id:abcdef, _rev:abcdef}
// DELETE users {_id:abcdef, _rev:abcdef}

//Custom endpoints (specific to this resource)
// POST   users/session        {email:adam@sirum.org, password}
// POST   users/email          {email:adam@sirum.org, subject, message, attachment}

//Replication Endpoints (for pouchdb, begin with underscore)
// POST   users/_bulk_get
// POST   users/_bulk_docs
// POST   users/_all_docs
// POST   users/_revs_diff
// POST   users/_changes

//Client
//this.db.users.get({email:adam@sirum.org})
//this.db.users.post({})
//this.db.users.put({})
//this.db.users.delete({})
//this.db.users.session.post({})
//this.db.users.email.post({})

r('/goodrx/:ndc9/:name')
  .get(function*(ndc9, generics) {
    console.log(generics, JSON.parse(generics))
    this.body = yield drug.goodrx.call(this, {ndc9, generics:JSON.parse(generics)})
  })

//Undocumented routes needed on all databases for PouchDB replication
r('/')
  .get(function*() {
    if(this.headers.origin) //Not sure why we need this.  Shows welcome UUID & Version
      return yield proxy.call(this)

    this.type = 'html'
    this.body = fs.createReadStream(__dirname + '/../client/'+project.paths.root+'/'+project.paths['/']+'/index.html')
  })

r('/'+assets+'/:file', {end:false})
  .get(function*(file) {
    this.type = extname(this.url)
    let path = project.paths['/'+assets+'/'+file]
    this.body = fs.createReadStream(__dirname + (path ? this.url.replace(assets+'/'+file, path.slice(3)) : '/../client'+this.url))
  })

r('/:db/', {strict:true}) //Shows DB info including update_seq#
  .get(proxy)

r('/:db/_all_docs')       //Needed if indexedDb cleared on browser
  .get(all_docs)
  .post(all_docs)

r('/:db/_revs_diff')      //Not sure why PouchDB needs this
  .post(proxy)

r('/:db/_local/:doc')
  .get(proxy)
  .put(proxy)
//post('/:db/_bulk_docs', proxy)          //Allow PouchDB to make bulk edits
//get('/users/_design/:doc', users.proxy) //TODO can I avoid sharing design docs with browser?
//get('/:db/_design/:doc', proxy)        //TODO can I avoid sharing design docs with browser?



//Drugs Resource Endpoint
r('/drug/_bulk_docs')    //Update denormalized transactions when drug is updated
  .post(drug.bulk_docs)

r('/drug/_changes')      //Lets PouchDB watch db using longpolling
  .get(drug.changes)

r('/drug/_bulk_get')     //Allow PouchDB to make bulk edits
  .post(drug.bulk_get)

//Account Resource Endpoint
r('/account/_bulk_docs')
  .post(account.bulk_docs)

r('/account/_changes')
  .get(account.changes)              //Lets PouchDB watch db using longpolling

r('/account/_bulk_get')
  .post(account.bulk_get)            //Allow PouchDB to make bulk edits

r('/user/_bulk_docs')
  .post(user.bulk_docs)

r('/user/_changes')
  .get(user.changes)    //Lets PouchDB watch db using longpolling

r('/user/_bulk_get')
  .post(user.bulk_get)            //Allow PouchDB to make bulk edits

r('/shipment/_bulk_docs')
  .post(shipment.bulk_docs)

r('/shipment/_changes')
  .get(shipment.changes)       //Lets PouchDB watch db using longpolling

r('/shipment/_bulk_get')
  .post(shipment.bulk_get)     //Allow PouchDB to make bulk edits

r('/transaction/_bulk_docs')
  .post(transaction.bulk_docs)

r('/transaction/_changes')
  .get(transaction.changes)    //Lets PouchDB watch db using longpolling

r('/transaction/_bulk_get')
  .post(transaction.bulk_get)            //Allow PouchDB to make bulk edits

//TODO remove once bulk_get is implemented so that replication no longer needs get method
app.use(function* (next) {
  if (this.method == 'GET') {

    let path = this.path.split('/')

    if (path.length == 3) {
      let _id  = path.pop()

      this.query.selector = JSON.stringify({_id})

      this.query = this.query
      this.path  = path.join('/')
    }
  }

  yield next
})

r('/drug', {strict:true})
  .get(drug.get)
  .post(drug.post)
  .put(drug.put)
  .del(drug.delete)

r('/account', {strict:true})
  .get(account.get)
  .post(account.post)              //List all docs in resource. Strict means no trailing slash
  .put(account.put)
  .del(account.delete)             //Allow user to get, modify, & delete docs

r('/account/email')
  .post(account.email)                 //Allow user to get, modify, & delete docs

r('/account/authorized')     //Allow user to get, modify, & delete docs
  .get(account.authorized.get)
  .post(account.authorized.post)
  .del(account.authorized.delete)

//User Resource Endpoint
r('/user', {strict:true})
  .get(user.get)        //TODO only show logged in account's users
  .post(user.post)       //TODO only create user for logged in account
  .put(user.put)
  .del(user.delete)      //TODO only get, modify, & delete user for logged in account

r('/user/email')
  .post(user.email)           //TODO only get, modify, & delete user for logged in account

r('/user/session')
  .post(user.session.post)  //Login
  .del(user.session.delete) //Logout


//Shipment Resource Endpoint
r('/shipment', {strict:true})
  .get(shipment.get)          //List all docs in resource. TODO "find" functionality in querystring
  .post(shipment.post)
  .put(shipment.put)
  .del(shipment.delete)

r('/shipment/shipped')
  .post(shipment.shipped)         // TODO add shipped_at date and change status to shipped

r('/shipment/received')
  .post(shipment.received)       // TODO add recieved_at date and change status to received

r('/shipment/pickup')
  .post(shipment.pickup.post)      // add pickup_at date. Allow webhook filtering based on query string ?description=tracker.updated&result.status=delivered.
  .del(shipment.pickup.delete)     // delete pickup_at date

r('/shipment/manifest')
  .get(shipment.manifest.get)    // pdf options?  if not exists then create, rather than an explicit POST method
  .del(shipment.manifest.delete) // delete an old manifest

//Transaction Resource Endpoint
r('/transaction', {strict:true})
  .get(transaction.get)          //List all docs in resource. Strict means no trailing slash
  .post(transaction.post)                        //Create new record in DB with short uuid
  .put(transaction.put)
  .del(transaction.delete)                   //TODO replace this with a show function. Allow user to get, modify, & delete docs

r('/transaction/history')
  .get(transaction.history)          //Resursively retrieve transaction's history

r('/transaction/verified')
  .post(transaction.verified.post)  //New transaction created in inventory, available for further transactions
  .del(transaction.verified.delete) //New transaction removed from inventory, cannot be done if item has further transactions


//all(/on?deep.field=this&this.must.be.true.to.trigger=true)
//all(/on?deep.field=this)
//all(/event)

app.listen(80); console.log('listening on port 80')
