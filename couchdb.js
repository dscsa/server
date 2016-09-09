"use strict"
// 
// let http = require('./http')({hostname:'localhost', port: 5984, middleware:false})
//
// // Give it a getRole, views, libs, defaults, validate
// //also add isRole, emitRole, filter,
// //return middleware view/list functions,
//
// couchdb('transaction').roles(userRoles, docRoles).views(views).libs(libs).validate(validate).then(list => {
//   //Creates Database, Design Document with Filter/Views/Libs,
//   //returns view/list functions and proxys
// })

exports.string = function(fn) {
  fn = fn.toString()
  fn = fn.startsWith('function') ? fn : 'function '+fn

  //Regarding views/lib placement: http://couchdb-13.readthedocs.io/en/latest/1.1/commonjs/
  fn = fn.replace(/require\(("|')/g, 'require($1views/lib/')

  //stupid spidermonkey doesn't evaluate function unless surrounded by ()
  return '('+fn+')'
}

exports.lists = {
  all:function(head, req) {
    send('[')
    var row = getRow()
    if (row) {
      send(toJSON(row.doc))
      while(row = getRow())
        send(','+toJSON(row.doc))
    }
    send(']')
  }
}

exports.isRole = function(doc, userCtx) {
  getRoles = require('getRoles')
  return getRoles(doc, function(res, role) {
    return res || role === true || role == userCtx.roles[0] || '_admin' == userCtx.roles[0]
  })
}

exports.list = function(db, ddoc, list, view) {
  return (startKey, endKey) => {
    let url = `${db}/_design/${ddoc}/_list/${list}/${view}?include_docs=true`

    if ( ! startKey)
      return url

    startKey = JSON.stringify(startKey)

    if ( ! endKey)
      return `${url}&key=${startKey}`

    endKey = JSON.stringify(endKey)

    return `${url}&startkey=${startKey}&endkey=${endKey}`
  }
}

exports.filter = function(db, ddoc, filter) {
   return _ => `${db}/_changes?filter=${ddoc}/${filter}`
}

exports.ensure = function(prefix, args) {

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
