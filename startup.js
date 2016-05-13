"use strict"

let co        = require('koa/node_modules/co')
let http      = require('./http')({hostname:'localhost', port: 5984, middleware:false})
let secret    = require('../development')

//TODO set _users db admin role to ['user']
//TODO set this on the command line rather than in code
let authorization  = 'Basic '+new Buffer(secret.username+':'+secret.password).toString('base64')

function all(head, req) {
  send('[')
  var row = getRow()
  if (row) {
    send(toJSON(row.doc))
    while(row = getRow())
      send(','+toJSON(row.doc))
  }
  send(']')
}

function toString(fn) {
  fn = fn.toString()
  fn = fn.startsWith('function') ? fn : 'function '+fn
  //some stupid spidermonkey expression doesn't evaluate to function unless surrounded by ()
  return '('+fn+')'
}

function *addDesignDocs (name) {
  let views = {}, filters = {}, shows = {}
  let db = require('./'+name.replace('_', ''))

  let res = yield http.put(name).headers({authorization}).body(true) //Create the database

  //This may be too much magic for best practice but its really elegant.  Replace the export function
  //with the url used to call the export so the original module can call it properly
  for (let key in db.view) {
    views[key]   = {map:toString(db.view[key])}
    db.view[key] = key => `${name}/_design/auth/_list/all/authorized?include_docs=true&key="${key}"`
  }

  //See note on "too much magic" above
  for (let key in db.filter) {
    filters[key] = toString(db.filter[key])
    db.filter[key] = url => `${name}/_changes?filter=auth/${key}`
  }

  //See note on "too much magic" above
  for (let key in db.show) {
    shows[key] = toString(db.show[key])
    db.show[key] = id => `${name}/_design/auth/_show/authorized/${id}`
  }

  let design = yield http.get(name+'/_design/auth').headers({authorization})

  yield http.put(name+'/_design/auth').headers({authorization}).body({
    _rev:design.body._rev,
    views,
    filters,
    shows,
    validate_doc_update:toString(db.validate_doc_update),
    lists:{ all:toString(all) }
  })

  yield http.put(name+'/_security').headers({authorization}).body({
     admins:{names:[], roles: ["user"]},
     members:{names:[], roles: []}
  })
}

co(function*() {
  let all = ['accounts', '_users', 'drugs', 'shipments', 'transactions'].map(addDesignDocs)

  try {
    yield all //TODO Promise.all[] doesn't work for generators although this is deprecated in Koa v2
    console.log('Success adding design docs to database')
  } catch(err) {
    console.log('Error adding design docs to database', err.stack)
  }
})
