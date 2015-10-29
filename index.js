"use strict"

require('./startup')
var app          = require('koa')()
var route        = require('koa-route')
var couch        = require('./couch')
var drugs        = require('./drugs')
var accounts     = require('./accounts')
var users        = require('./users')
var shipments    = require('./shipments')
var transactions = require('./transactions')

function router(method) {
  return function(url,handler,options) {
    app.use(route[method](url, wrapper,options))
    function *wrapper() {
      this.set('x-endpoint', method+' '+url+' for '+this.url)
      yield handler.apply(this, arguments)
    }
  }
}
//Shortcuts for defining routes with common methods
var get  = router('get')
var post = router('post')
var del  = router('del')
var all  = router('all')

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

//Rather setting up CouchDB for CORS, it's easier & more secure to do here
app.use(function* (next) {
  this.set('access-control-allow-origin', this.headers.origin)
  this.set('access-control-allow-headers', 'accept, content-type')
  this.set('access-control-allow-methods', 'GET, POST, OPTIONS, PUT, DELETE')
  this.set('access-control-allow-credentials', true)
  this.set('access-control-max-age', 1728000)
  this.method == 'OPTIONS' ? this.status = 204 : yield next
})

//Undocumented routes needed on all databases for PouchDB replication
get('/', couch.proxy)                    //Not sure why we need this.  Shows welcome UUID & Version
get('/:db/', couch.proxy, {strict:true}) //Shows DB info including update_seq#
get('/:db/_all_docs', couch.proxy)       //Needed if indexedDb cleared on browser
get('/users/_changes', users.changes)    //Lets PouchDB watch db using longpolling
get('/:db/_changes', couch.changes)      //Lets PouchDB watch db using longpolling
post('/:db/_revs_diff', couch.proxy)     //Not sure why PouchDB needs this
post('/:db/_bulk_docs', couch.proxy)     //Allow PouchDB to make bulk edits
get('/:db/_design/:doc', couch.proxy)    //TODO can I avoid sharing design docs with browser?
all('/:db/_local/:doc', couch.doc)       //Only GET & PUT seem to be needed

//Drugs Resource Endpoint
get('/drugs', drugs.list, {strict:true})
post('/drugs', drugs.post)               //Create new record in DB with short uuid
all('/drugs/:id', drugs.doc)             //TODO should PUT be admin only?
//put('/drugs/:id/retail')
//put('/drugs/:id/wholesale')
//TODO how to update pricing GoodRx, NADAC.  Per drug or as a group? Part of post/update or separate end point

//Account Resource Endpoint
get('/accounts', accounts.list, {strict:true})              //List all docs in resource. Strict means no trailing slash
post('/accounts', accounts.post)                            //Create new record in DB with short uuid
all('/accounts/:id', accounts.doc)                          //Allow user to get, modify, & delete docs
post('/accounts/:id/email', accounts.email)                 //Allow user to get, modify, & delete docs
get('/accounts/:id/authorized', accounts.authorized.get)    //Allow user to get, modify, & delete docs
post('/accounts/:id/authorized', accounts.authorized.post)  //Allow user to get, modify, & delete docs
del('/accounts/:id/authorized', accounts.authorized.delete) //Allow user to get, modify, & delete docs

//User Resource Endpoint
get('/users', users.list, {strict:true})        //TODO only show logged in account's users
post('/users', users.post)                      //TODO only create user for logged in account
all('/users/:id', users.doc)                    //TODO only get, modify, & delete user for logged in account
post('/users/:id/email', users.email)           //TODO only get, modify, & delete user for logged in account
post('/users/:id/session', users.session.post)  //Login
del('/users/:id/session', users.session.delete) //Logout

//Shipment Resource Endpoint
get('/shipments', shipments.list, {strict:true})          //List all docs in resource. TODO "find" functionality in querystring
post('/shipments', shipments.post)                        // TODO label=fedex creates label, maybe track=true/false eventually
all('/shipments/:id', shipments.doc)                      // Allow user to get, modify, & delete docs
post('/shipments/:id/shipped', shipments.shipped)         // TODO add shipped_at date and change status to shipped
post('/shipments/:id/received', shipments.received)       // TODO add recieved_at date and change status to received
post('/shipments/:id/pickup', shipments.pickup.post)      // add pickup_at date. Allow webhook filtering based on query string ?description=tracker.updated&result.status=delivered.
del('/shipments/:id/pickup', shipments.pickup.delete)     // delete pickup_at date
get('/shipments/:id/manifest', shipments.manifest.get)    // pdf options?  if not exists then create, rather than an explicit POST method
del('/shipments/:id/manifest', shipments.manifest.delete) // delete an old manifest

//Transaction Resource Endpoint
get('/transactions', transactions.list, {strict:true})          //List all docs in resource. Strict means no trailing slash
post('/transactions', transactions.post)                        //Create new record in DB with short uuid
del('/transactions/:id', transactions.delete)                   //TODO replace this with a show function. Allow user to get, modify, & delete docs
all('/transactions/:id', transactions.doc)                      //TODO replace this with a show function. Allow user to get, modify, & delete docs
get('/transactions/:id/history', transactions.history)          //Resursively retrieve transaction's history
post('/transactions/:id/captured', transactions.captured.post)  //New transaction created in inventory, available for further transactions
del('/transactions/:id/captured', transactions.captured.delete) //New transaction removed from inventory, cannot be done if item has further transactions

//all(/on?deep.field=this&this.must.be.true.to.trigger=true)
//all(/on?deep.field=this)
//all(/event)

app.listen(3000); console.log('listening on port 3000')
