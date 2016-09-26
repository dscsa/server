"use strict"

let http = require('./http')({host:'localhost:5984', headers:{'content-type':'application/json', accept:'application/json'}, middleware:false})

// // Give it a getRole, views, libs, defaults, validate
// //also add isRole, emitRole, filter,
// //return middleware view/list functions,
//
// .then(list => {
//   //Creates Database, Design Document with Filter/Views/Libs,
//   //returns view/list functions and proxys
// })

function string(fn) {
  fn = fn.toString()
  fn = fn.startsWith('function') ? fn : 'function '+fn

  //Regarding views/lib placement: http://couchdb-13.readthedocs.io/en/latest/1.1/commonjs/
  fn = fn.replace(/require\(("|')/g, 'require($1views/lib/')

  //stupid spidermonkey doesn't evaluate function unless surrounded by ()
  return fn.replace(/function[^(]*/, 'function')
}

function isRole(doc, userCtx) {
  if (doc._deleted) return userCtx.roles.length
  if (doc._id.slice(0, 8) == '_design/') return false

  var authorized
  require('docRoles')(doc, function(role) {
    authorized = authorized === true || role === undefined || role == userCtx.roles[0] || '_admin' == userCtx.roles[0]
  })
  return authorized
}

function emitRole(doc, emit) {
  return function(key, val) {
    require('docRoles')(doc, function(role) {
      emit([role, key], val)
    })
  }
}

function list(head, req) {
  send('[')
  var row = getRow()
  if (row) {
    send(toJSON(row.doc || row.value))
    while(row = getRow())
      send(','+toJSON(row.doc || row.value))
  }
  send(']')
}

function filter(doc, req) {
  return require('isRole')(doc, req.userCtx)
}

function defaultDocRoles(doc, emit) {
  doc._id.slice(0, 7) != '_design/' && emit()
}

function defaultUserRoles(doc, emit) {
  emit()
}

function viewId(doc) {
  emitRole(doc._id, {rev:doc._rev})
}

module.exports = function(db, authorization, config) {

  let methods = {view:{},list:{}}, ddoc = {
    lists:{roles:string(list)},
    views:config.view || {}
  }

  if (config.validate)
    ddoc.validate_doc_update = string(config.validate)

  methods.changes = function() {
    //TODO we can't assume http installed as middleware
    return this.http.get(`${db}/_changes${ ddoc.filters && '?filter=roles/roles' || ''}`)
  }

  config.lib.ensure = ensure //TODO get rid of this hard dependency
  config.lib.docRoles = config.docRoles || defaultDocRoles
  config.lib.isRole   = isRole
  config.lib.emitRole = emitRole

  if (config.userRoles && config.docRoles)
    ddoc.filters = {roles:string(filter)}

  config.userRoles = config.userRoles || defaultUserRoles

  ddoc.views.id = viewId

  for (let i in ddoc.views) {
    let inject  = "var emitRole = require('views/lib/emitRole')(doc, emit);"
    let view    = string(ddoc.views[i].map || ddoc.views[i])
    let hasRole = ~ view.indexOf('emitRole(')

    ddoc.views[i] = {
      map:view.replace('{', '{'+inject),
      reduce:ddoc.views[i].reduce
    }

    methods.list[i] = methodFactory(hasRole, i, '_list/roles', !ddoc.views[i].reduce)
    methods.view[i] = methodFactory(hasRole, i, '_view', !ddoc.views[i].reduce)
  }

  for (let i in config.lib)
    config.lib[i] = 'module.exports = '+string(config.lib[i])

  ddoc.views.lib = config.lib

  http.put(db, {}).headers({authorization}).catch(_ => null) //Create the database, suppress error
  .then(_   => http.get(db+'/_design/roles').headers({authorization}).body)
  .then(old => ddoc._rev = old._rev)
  .catch(_ => null) //suppress error if this is a new ddoc
  .then(_ => http.put(db+'/_design/roles', ddoc).headers({authorization}))

  return function *(next) {
    config.userRoles(this, role => config.role = role)
    this.db = this.db || {}
    this.db[db] = {list:{}, view:{}}
    this.db[db].changes = methods.changes.bind(this)
    for (let i in methods.list) {
      this.db[db].list[i] = methods.list[i].bind(this)
      this.db[db].view[i] = methods.view[i].bind(this)
    }

    yield next
  }

  function methodFactory(hasRole, view, path, includeDocs) {
    return function(startKey = '', endKey = '', opts = {}) {

      let url = `${db}/_design/roles/${path}/${view}?`

      if (includeDocs)
        url += 'include_docs=true&'

      if (opts.limit)
        url += `limit=${opts.limit}&`

      if (Array.isArray(startKey)) {
        let keys = startKey.map(key => [config.role, key])
        //TODO we can't assume http installed as middleware
        return this.http.post(url, {keys}).body.then(body => {
          for (let row of body.rows) row.key = row.key[1]
          return body
        })
      }

      if (endKey === true || (hasRole && ! startKey)) //If no start key, we need to do authentication for all_docs which requires a range
        endKey = startKey+'\uffff'

      if (hasRole) //Even if no start key, we need to do authentication
        startKey = [config.role, startKey]

      if (hasRole && endKey)
        endKey = [config.role, endKey]

      if (startKey) {
        startKey = JSON.stringify(startKey)
        url += endKey ? `&startkey=${startKey}&endkey=${JSON.stringify(endKey)}` : `&key=${startKey}`
      }
      //TODO we can't assume http installed as middleware
      return this.http.get(url)
    }
  }
}

function ensure(prefix, args) {
  var newDoc  = args[0]
  var oldDoc  = args[1]
  var userCtx = args[2]

  return function(path) {

    function extract(doc) {
      var vals = [doc]
      var keys = path.split('.')

      for (var i in keys) {
        for (var j in vals) {

          if ( ! vals[j])
            throw({forbidden:prefix+'.'+path+', '+toJSON(vals[j])+'.'+keys[i]+', does not exist'})

          var innerObj = vals[j][keys[i]]

          //log('\n'+toJSON(keys)+' ---> '+keys[i]+'\n\n\n'+JSON.stringify(vals[j], null, "  ")+'\n\n--->\n\n'+JSON.stringify(innerObj, null, "  "))

          //Flatten resulting array if it is in middle but not end of path
          //e.g., transaction.history._id would flatten since history is an
          //array but transaction.drug.generics would not since it ends as an array
          if (isArray(innerObj) && i < keys.length-1) {
            vals.splice(j, 1)
            vals = vals.concat(innerObj)
          } else {
            vals[j] = innerObj
          }
        }
      }
      return vals
    }

    function isNull(val) {
      return val == null || val === ''
    }

    //Do not validate local or deleted documents
    var values = newDoc._id.slice(0, 7) == '_local/' || newDoc._deleted ? [] : extract(newDoc)

    var api = {
      assert:function(callback) {
        for (var i in values) {
          var msg = callback(values[i], newDoc, userCtx)
          if (typeof msg == 'string') {
            throw({forbidden:prefix+'.'+path+' == '+toJSON(values[i])+', but '+msg})
          }
        }
        return api
      },
      regex:function(regex) {
        return api.assert(function(val) {
          return isNull(val) || regex.test(val) || 'must match regex '+regex
        })
      },
      length:function(min, max) {
        return api.assert(function(val) {
          if (max === undefined) max = min
          return isNull(val) || (val.length >= min && val.length <= max) || "must have a length between "+min+" and "+max
        })
      }
    }

    api.__defineGetter__('notNull', function() {
      return api.assert(function(val) {
        return ! isNull(val) || 'cannot be null or undefined'
      })
    })

    api.__defineGetter__('isNumber', function() {
      return api.assert(function(val) {
        return isNull(val) || typeof val == 'number' || 'must be a number'
      })
    })

    api.__defineGetter__('isString', function() {
      return api.assert(function(val) {
        return isNull(val) || typeof val == 'string' || 'must be a string'
      })
    })

    api.__defineGetter__('isObject', function() {
      return api.assert(function(val) {
        return isNull(val) || typeof val == 'object' && ! isArray(val) || 'must be an object'
      })
    })

    api.__defineGetter__('isArray', function() {
      return api.assert(function(val) {
        return isNull(val) || isArray(val) || 'must be an array'
      })
    })

    api.__defineGetter__('isDate', function() {
      return api.assert(function(val) {
        return isNull(val) || val == new Date(val).toJSON() || 'must be a valid date formatted as a JSON string'
      })
    })

    api.__defineGetter__('notChanged', function() {

      if (! oldDoc) return api

      var oldVals = extract(oldDoc)
      var newVals = []

      api.assert(function(newVal) {
        newVals.push(newVal)
      })

      return toJSON(newVals) == toJSON(oldVals) || 'cannot be changed from '+oldVals
    })


    return api
  }
}
