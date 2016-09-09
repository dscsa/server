"use strict"

let co        = require('../co')
let couchdb   = require('./couchdb')
let http      = require('./http')({hostname:'localhost', port: 5984, middleware:false})
let secret    = require('../../keys/dev')

//TODO set _users db admin role to ['user']
//TODO set this on the command line rather than in code
let authorization  = 'Basic '+new Buffer(secret.username+':'+secret.password).toString('base64')

function *addDesignDocs (name) {
  let views = {lib:{}}, filters = {}, shows = {}, lists = {}
  let db = require('./'+name)

  yield http.put(name).headers({authorization}).body(true).catch(_ => null) //Create the database

  //Note ./startup.js saves views,filters,and shows as toString into couchdb and then replaces
  //them with a function that takes a key and returns the couchdb url needed to call them.
  //TODO An optional request parameter to sync all/partial e.g., transactions or just inventory?
  db.filter = {
    authorized(doc, req) {
      return require('isRole')(doc, req.userCtx)
    }
  }

  //This may be too much magic for best practice but its really elegant.  Replace the export function with
  //the url used to call the export so the original module can call a couchdb function just like a normal one.
  for (let viewName in db.view) {
    views[viewName]   = {map:couchdb.string(db.view[viewName])}
    db.view[viewName] = couchdb.view(name, 'auth', 'all', viewName)
  }

  //See note on "too much magic" above
  for (let filterName in db.filter) {
    filters[filterName]   = couchdb.string(db.filter[filterName])
    db.filter[filterName] = couchdb.filter(name, 'auth', filterName)
  }

  //See note on "too much magic" above
  for (let showName in db.show) {
    shows[showName]   = couchdb.string(db.show[showName])
    db.show[showName] = couchdb.show(name, 'auth', showName)
  }

  //See note on "too much magic" above
  for (let listName in couchdb.lists) {
    lists[listName] = couchdb.string(couchdb.lists[listName])
  }

  //See note on "too much magic" above
  //Regarding views/lib placement: http://couchdb-13.readthedocs.io/en/latest/1.1/commonjs/
  db.libs.isRole = couchdb.isRole
  db.libs.ensure = couchdb.ensure
  if (db.getRoles)
    db.libs.getRoles = db.getRoles
  for (let libName in db.libs) {
    views.lib[libName] = 'module.exports = '+couchdb.string(db.libs[libName])
  }

  let design = yield http.get(name+'/_design/auth').headers({authorization}).catch(err => console.log(err.reason == 'missing' ? 'Initializing new CouchDB database' : err))

  yield http.put(name+'/_design/auth').headers({authorization}).body({
    _rev:design && design._rev,
    views,
    filters,
    shows,
    validate_doc_update:couchdb.string(db.validate),
    lists
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
