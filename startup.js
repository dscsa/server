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

function ensure(key) {

  function extract(obj, keys) {
    var $keys = JSON.stringify(keys)
    var key = keys.shift()
    var len = keys.length //cache this before recursion which will reduce length
    var res = []

    if ( ! key ) return obj

    obj = isArray(obj) ? obj : [obj]

    for (i in obj) {
      var val = extract(obj[i][key], keys)    //walk through object with recursion

      val = isArray(val) && len ? val : [val] //if end result is an array e.g, drug.generics then keep, otherwise flatten

      res.push.apply(res, val)
    }

    return res
  }

  var value = extract(newDoc, key.split('.'))

  var api = {
    assert:function(callback) {
      for (var i in value) {
        var msg = callback(value[i], i)
        if (typeof msg == 'string')
          throw({forbidden:ensure.prefix+'.'+key+' '+msg+'. Got '+toJSON(value[i])+' from '+toJSON(newDoc)})
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

    var oldVal = extract(oldDoc, key.split('.'))

    return api.assert(function(val, i) {
      var old = toJSON(oldVal[i])
      return toJSON(val) == old || 'cannot be changed from '+old
    })
  })


  return api
}

// function ensure(name, value) {
//   log('ensure')
//   log(ensure.caller)
//   log(ensure.caller.arguments)
//   log(ensure.caller.arguments[0])
//   var fluent = {
//     hasId:function() {
//       if (typeof value._id == 'string' && value._id.length == 7) return fluent
//       throw({forbidden:name+' must have a valid _id property. Got '+toJSON(newDoc)})
//     },
//     isDate:function() {
//       if (value == new Date(value).toJSON()) return fluent
//       throw({forbidden:name+' must be a valid date formatted as a JSON string. Got '+toJSON(newDoc)})
//     },
//     isNumber:function() {
//       if (typeof value == 'number') return fluent
//       throw({forbidden:name+' must be a number. Got '+toJSON(newDoc)})
//     },
//     isString:function() {
//       if (typeof value == 'string') return fluent
//       throw({forbidden:name+' must be a string. Got '+toJSON(newDoc)})
//     },
//     isObject:function() {
//       if (typeof value == 'object') return fluent
//       throw({forbidden:name+' must be an object. Got '+toJSON(newDoc)})
//     },
//     isArray:function() {
//       if (isArray(value)) return fluent
//       throw({forbidden:name+' must be an array. Got '+toJSON(newDoc)})
//     },
//     notChanged:function() {
//       var key = name.split('.').slice(1).join('.')
//       if (toJSON(newDoc[key]) == toJSON(oldDoc[key]) return fluent
//       throw({forbidden:name+' cannot be changed. Got '+toJSON(newDoc)})
//     }
//   }
//
//   return fluent
// }

function *addDesignDocs (name) {
  let views = {}, filters = {}, shows = {}
  let db = require('./'+name.replace('_', ''))

  yield http.delete(name).headers({authorization}).body(true)
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

  let validate_doc_update = toString(db.validate_doc_update).replace('{', "{\n"+ensure)

  yield http.put(name+'/_design/auth').headers({authorization}).body({
    _rev:design.body._rev,
    views,
    filters,
    shows,
    validate_doc_update,
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
