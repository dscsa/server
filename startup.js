"use strict"

let co        = require('../co')
let couchdb   = require('./couchdb')
let http      = require('./http')({hostname:'localhost', port: 5984, middleware:false})
let secret    = require('../../keys/dev')

//TODO set _users db admin role to ['user']
//TODO set this on the command line rather than in code
let authorization  = 'Basic '+new Buffer(secret.username+':'+secret.password).toString('base64')

function *addDesignDocs (name) {
  let views = {}, filters = {}, shows = {}
  let db = require('./'+name)

  yield http.put(name).headers({authorization}).body(true).catch(_ => null) //Create the database

  //This may be too much magic for best practice but its really elegant.  Replace the export function with
  //the url used to call the export so the original module can call a couchdb function just like a normal one.
  for (let viewName in db.view) {
    views[viewName]   = {map:couchdb.inject(db.view[viewName])}
    db.view[viewName] = couchdb.list(name, 'auth', 'all', viewName)
  }

  //See note on "too much magic" above
  for (let filterName in db.filter) {
    filters[filterName]   = couchdb.inject(db.filter[filterName])
    db.filter[filterName] = couchdb.filter(name, 'auth', filterName)
  }

  //See note on "too much magic" above
  for (let showName in db.show) {
    shows[showName]   = couchdb.inject(db.show[showName])
    db.show[showName] = couchdb.show(name, 'auth', showName)
  }

  let design = yield http.get(name+'/_design/auth').headers({authorization}).catch(err => {
    console.log('CouchDB is not running or this a new database install', err)
    return {}
  })

  yield http.put(name+'/_design/auth').headers({authorization}).body({
    _rev:design._rev,
    views,
    filters,
    shows,
    validate_doc_update:db.validate_doc_update,
    lists:couchdb.lists
  })
}

co(function*() {
  let all = ['account', 'user', 'drug', 'shipment', 'transaction'].map(addDesignDocs)

  try {
    yield all //TODO Promise.all[] doesn't work for generators although this is deprecated in Koa v2
    console.log('Success adding design docs to database')
  } catch(err) {
    console.log('Error adding design docs to database\n', err instanceof Error ? err.stack : err)
  }
})
