"use strict"

function injector() {
  var args = [].slice.call(arguments)


  args.unshift($inject)


  //Extract the actual function AND remove it from args array
  var fn = args.splice(args.length - arguments.length - 1, 1)[0]

  // for (var i in args) {
  //   log('arg '+i)
  //   log( typeof args[i] == 'function' ? args[i].toString() : args[i])
  // }

  return fn.apply(this, args)
}

exports.inject = function() {

  var $inject = []
  for (var fn of arguments) {
    fn = fn.toString()
    fn = fn.startsWith('function') ? fn : 'function '+fn
    $inject.push(fn)
  }

  //some stupid spidermonkey expression doesn't evaluate to function unless surrounded by ()
  return '('+injector.toString().replace('$inject', $inject)+')'
}

exports.lists = {
  all:exports.inject(function(head, req) {
    send('[')
    var row = getRow()
    if (row) {
      send(toJSON(row.doc))
      while(row = getRow())
        send(','+toJSON(row.doc))
    }
    send(']')
  })
}

exports.list = function(db, ddoc, list, view) {
  return (startKey, endKey) => {
    let url = `${db}/_design/${ddoc}/_list/${list}/${view}?include_docs=true`

    if ( ! startKey)
      return url

    if ( ! endKey)
      return `${url}&key="${startKey}"`

    return `${url}&startkey="${startKey}"&endkey="${endKey}"`
  }
}

exports.filter = function(db, ddoc, filter) {
   return _ => `${db}/_changes?filter=${ddoc}/${filter}`
}

exports.show = function(db, ddoc, show) {
  return id => `${db}/_design/${ddoc}/_show/${show}/${id}`
}

exports.ensure = function(prefix, newDoc, oldDoc) {
  return function(path) {

    //Do not validate local or deleted documents
    if (newDoc._id.slice(0, 7) == '_local/' || newDoc._deleted)
      return api

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

    var values = extract(newDoc)

    var api = {
      assert:function(callback) {
        for (var i in values) {
          var msg = callback(values[i], i)
          if (typeof msg == 'string') {
            throw({forbidden:prefix+'.'+path+' == '+toJSON(values[i])+', but '+msg})
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
}
