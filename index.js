"use strict"

require('./startup')
let app          = require('koa')()
let route        = require('koa-route')
let http         = require('./http')
let drugs        = require('./drugs')
let accounts     = require('./accounts')
let users        = require('./users')
let shipments    = require('./shipments')
let transactions = require('./transactions')

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
  yield this.http(this.url.replace('users', '_users'), true)
}

function* all_docs(db) {
  yield this.http(db.replace('users', '_users')+'/_design/auth/_view/authorized', true)
}

app.use(function* (next) {
  //Sugar
  this.account = this.cookies.get('AuthAccount')

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
    this.status = err.status || 500;
    this.body   = err.message+"\n"+err.stack;
  }
});

//Undocumented routes needed on all databases for PouchDB replication
r('/')                    //Not sure why we need this.  Shows welcome UUID & Version
  .get(proxy)

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
r('/drugs/_bulk_docs')    //Update denormalized transactions when drug is updated
  .post(drugs.bulk_docs)

r('/drugs/_changes')      //Lets PouchDB watch db using longpolling
  .get(drugs.changes)

r('/drugs/_bulk_get')     //Allow PouchDB to make bulk edits
  .post(drugs.bulk_get)

r('/drugs', {strict:true})
  .get(drugs.list)
  .post(drugs.post)

r('/drugs/:id')
  .get(drugs.get)
  .put(drugs.put)
  .del(drugs.delete)

//Account Resource Endpoint
r('/accounts/_bulk_docs')
  .post(accounts.bulk_docs)

r('/accounts/_changes')
  .get(accounts.changes)              //Lets PouchDB watch db using longpolling

r('/accounts/_bulk_get')
  .post(accounts.bulk_get)            //Allow PouchDB to make bulk edits

r('/accounts', {strict:true})
  .get(accounts.list)
  .post(accounts.post)              //List all docs in resource. Strict means no trailing slash

r('/accounts/:id')
  .get(accounts.get)
  .put(accounts.put)
  .del(accounts.delete)                          //Allow user to get, modify, & delete docs

r('/accounts/:id/email')
  .post(accounts.email)                 //Allow user to get, modify, & delete docs

r('/accounts/:id/authorized')     //Allow user to get, modify, & delete docs
  .get(accounts.authorized.get)
  .post(accounts.authorized.post)
  .del(accounts.authorized.delete)

//User Resource Endpoint
r('/users/_bulk_docs')
  .post(users.bulk_docs)

r('/users/_changes')
  .get(users.changes)    //Lets PouchDB watch db using longpolling

r('/users/_bulk_get')
  .post(users.bulk_get)            //Allow PouchDB to make bulk edits

r('/users', {strict:true})
  .get(users.list)        //TODO only show logged in account's users
  .post(users.post)                      //TODO only create user for logged in account

r('/users/:id')
  .get(users.get)
  .put(users.put)
  .del(users.delete)                   //TODO only get, modify, & delete user for logged in account

r('/users/:id/email')
  .post(users.email)           //TODO only get, modify, & delete user for logged in account

r('/users/:id/session')
  .post(users.session.post)  //Login
  .del(users.session.delete) //Logout


//Shipment Resource Endpoint
r('/shipments/_bulk_docs')
  .post(shipments.bulk_docs)

r('/shipments/_changes')
  .get(shipments.changes)       //Lets PouchDB watch db using longpolling

r('/shipments/_bulk_get')
  .post(shipments.bulk_get)     //Allow PouchDB to make bulk edits

r('/shipments', {strict:true})
  .get(shipments.list)          //List all docs in resource. TODO "find" functionality in querystring
  .post(shipments.post)

r('/shipments/:id')             // Allow user to get, modify, & delete docs
  .get(shipments.get)
  .put(shipments.put)
  .del(shipments.delete)

r('/shipments/:id/shipped')
  .post(shipments.shipped)         // TODO add shipped_at date and change status to shipped

r('/shipments/:id/received')
  .post(shipments.received)       // TODO add recieved_at date and change status to received

r('/shipments/:id/pickup')
  .post(shipments.pickup.post)      // add pickup_at date. Allow webhook filtering based on query string ?description=tracker.updated&result.status=delivered.
  .del(shipments.pickup.delete)     // delete pickup_at date

r('/shipments/:id/manifest')
  .get(shipments.manifest.get)    // pdf options?  if not exists then create, rather than an explicit POST method
  .del(shipments.manifest.delete) // delete an old manifest

//Transaction Resource Endpoint
r('/transactions/_bulk_docs')
  .post(transactions.bulk_docs)

r('/transactions/_changes')
  .get(transactions.changes)    //Lets PouchDB watch db using longpolling

r('/transactions/_bulk_get')
  .post(transactions.bulk_get)            //Allow PouchDB to make bulk edits

r('/transactions', {strict:true})
  .get(transactions.list)          //List all docs in resource. Strict means no trailing slash
  .post(transactions.post)                        //Create new record in DB with short uuid

r('/transactions/:id')
  .get(transactions.get)
  .put(transactions.put)
  .del(transactions.delete)                   //TODO replace this with a show function. Allow user to get, modify, & delete docs

r('/transactions/:id/history')
  .get(transactions.history)          //Resursively retrieve transaction's history

r('/transactions/:id/verified')
  .post(transactions.verified.post)  //New transaction created in inventory, available for further transactions
  .del(transactions.verified.delete) //New transaction removed from inventory, cannot be done if item has further transactions


//all(/on?deep.field=this&this.must.be.true.to.trigger=true)
//all(/on?deep.field=this)
//all(/event)

app.listen(3000); console.log('listening on port 3000')
