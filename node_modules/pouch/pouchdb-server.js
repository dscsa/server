"use strict"

//TODO create a _users db
let baseUrl   = 'http://localhost:5984/'
let admin     = {ajax:{auth:require('../../keys/dev').couch, timeout:60000}}
let query     = require('pouchdb-mapreduce')
let adapter   = require('pouchdb-adapter-http')
let model     = require('./pouchdb-model.js')
let ajax      = require('../server/helpers/ajax.js')()
let schema    = require('./pouchdb-schema.js')(model, micro)
let PouchDB   = require('pouchdb-core').plugin(query).plugin(adapter)

schema._users = model()

for (let db in schema) {

  let resource = require('../server/models/'+db)

  schema[db] = resource.validate(schema[db])

  //Pouch will create this database if it does not exist
  //TODO skipSetup and then create missing databases, or
  //figure out how to remove admin options after creating db
  console.log('new db', baseUrl+db)
  exports[db] = new PouchDB.plugin(schema[db])(baseUrl+db, admin)

  exports[db].allDocs({startkey:'_design/', endkey:'_design/{}', include_docs:true}).then(ddocs => {

    //pouchdb doesn't allow _id:_security in its put(), so do it manually
    //wait for other calls because pouchdb doesn't create db immediately
    ajax({
      method:'PUT',
      url:baseUrl+db+'/_security',
      body:{admins:{}, members:{roles:['allAccounts']}},
      auth:admin.ajax.auth
    })
    .catch(err => console.log('_security error', err))

    for (let i in resource.views) {

      let update = true
      let view = resource.views[i]
      let ddoc = {
        _id:'_design/'+i,
        _rev:undefined, //placeholder for property order since JSON.stringify is used for object comparison latter on
        views:{}
      }

      ddoc.views[i] = {
        map:string(view.map || view, true),
        reduce:string(view.reduce, true)
      }

      //Remove ddocs that are no longer being used
      //Go backwards since deleteing ddocs as we go
      for (let i = ddocs.rows.length - 1; i >= 0; i--)  {

        let old = ddocs.rows[i].doc

        if (old._id != ddoc._id)
          continue

        ddocs.rows.splice(i, 1) //we will remove any old ddocs remaining at the end
        ddoc._rev = old._rev //this is so the update works

        if (JSON.stringify(ddoc) == JSON.stringify(old))
          update = false
      }

      if (update) {
        console.log( ddoc._rev ? 'updating' : 'adding', 'ddoc', ddoc._id)
        exports[db].put(ddoc, admin).catch(err => console.log('db initialization err', db, err, err.stack))
      }
    }

    for (let row of ddocs.rows) {
      console.log('removing ddoc', row.doc._id)
      exports[db].remove(row.doc, admin)
    }
  })

  let lib = []
  for (let i in resource.lib) {
    lib.push("'"+i+"':"+string(resource.lib[i]))
  }

  function string(fn, polyfill) {
    if ( ! fn || typeof fn == 'string') return fn

    fn = '('+fn+')'

    //TODO convert arrow functions
    if ( ! fn.startsWith('(function'))
      fn = addFunction(fn)

    //Regarding views/lib placement: http://couchdb-13.readthedocs.io/en/latest/1.1/commonjs/
    //however pouchdb doesn't support require() so we need to polyfill.  We only need polyfill
    //once at top level.
    if (polyfill && fn.includes('require('))
      fn = addRequire(fn)

    return fn
  }

  //Spidermoney does support shorthand methods
  function addFunction(fn) {
    return '(function '+fn.slice(1)
  }

  //TODO only require full lib object if dynamic require.  Otherwise only include libs actually used
  function addRequire(fn) {
    return fn.slice(0, -2)+'function require(path) { return {'+lib+'}[path]}\n})'
  }
}

//
//Hoisted Helper Functions
//

//Node shim to return number of microseconds for use in _id creation
function micro() {
  return ('000'+ process.hrtime()[1]).slice(-6, -3)
}
