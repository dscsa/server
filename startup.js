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

function ensure(path) {

  function extract(doc) {
    var vals = [doc]
    var keys = path.split('.')

    for (var i in keys) {
      for (var j in vals) {

        if ( ! vals[j])
          throw({forbidden:ensure.prefix+'.'+path+', '+toJSON(vals[j])+'.'+keys[i]+', does not exist'})

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

  var values = extract(newDoc)

  var api = {
    assert:function(callback) {
      for (var i in values) {
        var msg = callback(values[i], i)
        if (typeof msg == 'string') {
          throw({forbidden:ensure.prefix+'.'+path+', '+toJSON(values[i])+', '+msg})
        }
      }
      return api
    },
    regex:function(regex) {
      return api.assert(function(val) {
        return val == null || regex.test(val) || 'must match regex '+regex
      })
    },
    length:function(min, max) {
      return api.assert(function(val) {
        if (max === undefined) max = min
        return val == null || (val.length >= min && val.length <= max) || "must have a length between "+min+" and "+max
      })
    }
  }

  api.__defineGetter__('notNull', function() {
    return api.assert(function(val) {
      return val != null || 'cannot be null or undefined'
    })
  })

  api.__defineGetter__('isNumber', function() {
    return api.assert(function(val) {
      return val == null || typeof val == 'number' || 'must be a number'
    })
  })

  api.__defineGetter__('isString', function() {
    return api.assert(function(val) {
      return val == null || typeof val == 'string' || 'must be a string'
    })
  })

  api.__defineGetter__('isObject', function() {
    return api.assert(function(val) {
      return typeof val == 'object' && ! isArray(val) || 'must be an object'
    })
  })

  api.__defineGetter__('isArray', function() {
    return api.assert(function(val) {
      return val == null || isArray(val) || 'must be an array'
    })
  })

  api.__defineGetter__('isDate', function() {
    return api.assert(function(val) {
      return val == null || val == new Date(val).toJSON() || 'must be a valid date formatted as a JSON string'
    })
  })

  api.__defineGetter__('notChanged', function() {

    if ( ! oldDoc) return api

    var oldVals = extract(oldDoc)

    return api.assert(function(val, i) {
      var old = toJSON(oldVals[i])
      return toJSON(val) == old || 'cannot be changed from '+old
    })
  })


  return api
}

function *addDesignDocs (name) {
  let views = {}, filters = {}, shows = {}
  let db = require('./'+name)

  //yield http.delete(name).headers({authorization}).body(true)
  try {
    yield http.put(name).headers({authorization}).body(true) //Create the database
  } catch (err) {

  }
  //This may be too much magic for best practice but its really elegant.  Replace the export function
  //with the url used to call the export so the original module can call it properly
  for (let view in db.view) {
    views[view]   = {map:toString(db.view[view])}
    db.view[view] = key => `${name}/_design/auth/_list/all/${view}?include_docs=true&key="${key}"`
  }

  //See note on "too much magic" above
  for (let key in db.filter) {
    filters[key] = toString(db.filter[key])
    db.filter[key] = url => `${name}/_changes?filter=auth/${key}`
  }

  //See note on "too much magic" above
  for (let show in db.show) {
    shows[show] = toString(db.show[show])
    db.show[show] = id => `${name}/_design/auth/_show/${show}/${id}`
  }

  let design = yield http.get(name+'/_design/auth').headers({authorization})

  let validate_doc_update = toString(db.validate_doc_update).replace('{', "{\n"+ensure)

  yield http.put(name+'/_design/auth').headers({authorization}).body({
    _rev:design._rev,
    views,
    filters,
    shows,
    validate_doc_update,
    lists:{ all:toString(all) }
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
