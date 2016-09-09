"use strict"

require('./startup')
let fs          = require('fs')
let extname     = require('path').extname
let app         = require('koa')()
let route       = require('koa-route')
let http        = require('./http')
let project     = require('../client/aurelia_project/aurelia')
let assets      = project.build.targets[0].output

let resources = {
  drug          : require('./drug'),
  account       : require('./account'),
  user          : require('./user'),
  shipment      : require('./shipment'),
  transaction   :require('./transaction'),
}

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
//resources Documentation Guide:
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

//TODO remove this hack once no longer needed
r('/goodrx/:ndc9/:name')
  .get(function*(ndc9, generics) {
    console.log(generics, JSON.parse(generics))
    this.body = yield resources.drug.goodrx.call(this, {ndc9, generics:JSON.parse(generics)})
  })

function* proxy() {
  yield this.http(this.path, true)
}

//This can be a get or a post with specific keys in body.  If
//keys in body we cannot specify start/end keys in querystring
function* all_docs(db) {
  let url = `/${db}/_design/auth/_view/id`

  if (this.method == 'GET')
    url += `?startkey=["${this.user.account._id}"]&endkey=["${this.user.account._id}", "\uffff"]`

  yield this.http(url, true)
}

function* changes(db) {
  this.req.setTimeout(20000) //match timeout in dscsa-pouch
  let url = resources[db].filter.authorized(this.path)
  yield this.http(url, true)
}

function* bulk_docs(db) {
  yield resources[db].bulk_docs.call(this)
}

function* bulk_get(id) {
  this.status = 400
}

function* get(db) {
  yield resources[db].get.call(this)
}

function* post(db) {
  yield resources[db].post.call(this)
}

function* put(db) {
  yield resources[db].put.call(this)
}

function* del(db) {
  yield resources[db].delete.call(this)
}

function* getAsset(file) {
  this.type = extname(this.path)
  let path = project.paths['/'+assets+'/'+file]
  this.body = fs.createReadStream(__dirname + (path ? this.path.replace(assets+'/'+file, path.slice(3)) : '/../client'+this.path))
}

app.use(function* (next) {
  //Sugar
  this.path = decodeURIComponent(this.path)
  this.user = JSON.parse(this.cookies.get('AuthUser') || 'null')

  //Rather setting up CouchDB for CORS, it's easier & more secure to do here
  this.set('access-control-allow-origin', this.headers.origin)
  this.set('access-control-allow-headers', 'accept, content-type')
  this.set('access-control-allow-methods', 'GET, POST, OPTIONS, PUT, DELETE')
  this.set('access-control-allow-credentials', true)
  this.set('access-control-max-age', 1728000)
  this.set('access-control-expose-headers', 'Connection, content-length, date, etag, location, server, x-endpoint')
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

// CRUD Enpoints (common accross resourcess)
// GET    users?selector={"email":"adam@sirum.org"} || users?selector={"_id":"abcdef"} || selector={"name.first":"adam"}
// POST   users
// PUT    users {_id:abcdef, _rev:abcdef}
// DELETE users {_id:abcdef, _rev:abcdef}

//Custom endpoints (specific to this resources)
// POST   users/session        {email:adam@sirum.org, password}
// POST   users/email          {email:adam@sirum.org, subject, message, attachment}

//Replication Endpoints (for pouchdb, begin with underscore)
// POST   users/_bulk_get
// POST   users/_bulk_docs
// POST   users/_all_docs
// POST   users/_revs_diff
// POST   users/_changes

app.use(function *(next) {
  let role = this.user.account._id

  function get(list, proxy) {
    return function *(start, end) {
      if (end === true) end = start+'\uffff'
      yield this.http.get(list(start && [role, start], end && [role, end]), proxy)
    }
  }

  for (resource in resources) {
    this[resource] = resources[resource]
    this[resource].list = {}
    for (let view in resources.drug.view) {
      let list = couchdb.list(resource, 'auth', 'all', view)
      this[resource].list[view]         = get(list, false)
      this[resource].list[view+'Proxy'] = get(list, true)
    }
  }
})

//Serve the application and assets
r('/'+assets+'/:file', {end:false})
  .get(getAsset)

//CouchDB/PouchDB Replication API
r('/')
  .get(function*() {
    if(this.headers.origin || this.headers.referer) //Not sure why pouchdb checks this.  Shows welcome UUID & Version
      return yield proxy.call(this)

    this.path = '/'+assets+'/index.html'
    yield assets.call(this)
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

r('/:db/_bulk_docs')    //Update denormalized transactions when drug is updated
  .post(bulk_docs)

r('/:db/_changes')      //Lets PouchDB watch db using longpolling
  .get(changes)

r('/:db/_bulk_get')     //Allow PouchDB to make bulk edits
  .post(bulk_get)

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

//User API Endpoints
r('/:db', {strict:true})
  .get(get)
  .post(post)
  .put(put)
  .del(del)

r('/account/email')
  .post(resources.account.email)                 //Allow user to get, modify, & delete docs

r('/account/authorized')     //Allow user to get, modify, & delete docs
  .get(resources.account.authorized.get)
  .post(resources.account.authorized.post)
  .del(resources.account.authorized.delete)

r('/user/email')
  .post(resources.user.email)           //TODO only get, modify, & delete user for logged in account

r('/user/session')
  .post(resources.user.session.post)  //Login
  .del(resources.user.session.delete) //Logout

r('/shipment/shipped')
  .post(resources.shipment.shipped)         // TODO add shipped_at date and change status to shipped

r('/shipment/received')
  .post(resources.shipment.received)       // TODO add recieved_at date and change status to received

r('/shipment/pickup')
  .post(resources.shipment.pickup.post)      // add pickup_at date. Allow webhook filtering based on query string ?description=tracker.updated&result.status=delivered.
  .del(resources.shipment.pickup.delete)     // delete pickup_at date

r('/shipment/manifest')
  .get(resources.shipment.manifest.get)    // pdf options?  if not exists then create, rather than an explicit POST method
  .del(resources.shipment.manifest.delete) // delete an old manifest

// r('/transaction/verified')
//   .post(resources.transaction.verified.post)  //New transaction created in inventory, available for further transactions
//   .del(resources.transaction.verified.delete) //New transaction removed from inventory, cannot be done if item has further transactions


//all(/on?deep.field=this&this.must.be.true.to.trigger=true)
//all(/on?deep.field=this)
//all(/event)

app.listen(80); console.log('listening on port 80')
