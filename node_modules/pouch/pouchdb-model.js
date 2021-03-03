"use strict"

//TODO
//1. Use toString() method to cleverly save validation as string to validate_doc_update
//pouch.put(model.ensure('prop').required(),
//2. Allow async validation
//3. Allow streams as docs
//4. Bind to html5 input validation.  maxlength, pattern, etc


//Fluent API to define schema
if (typeof module == 'object') module.exports = pouchModel

let _prototype

function pouchModel() {
  //This is a function style plugin for pouchdb.  However we don't want to permanently change the prototype
  //with this plugin since it will be called once for each model that we want to create.  One way would be
  //to change prototype, create new instance, then revert prototype.  However that wasn't working because
  //no way to revert prototype before next model instance was created.  "Created" event is async so it doesn't
  //fire in time. Only way I can think of is to add these methods to the instance itself through a hack.  We
  //wrap each adapter which has the new instance as "this" and set out methods there.
  function plugin(PouchDB) {

    if ( ! _prototype) //First time this plugin has been run
      _prototype = PouchDB.prototype

    //Make a clone since we want our schema to be model specific and not persist to other models
    //since this function may be called multiple times (once for each model) we need to save PouchDB's
    //original prototype - not the current prototype - and extend it each time
    let adapter, prototype = Object.create(_prototype)

    prototype.__defineGetter__('adapter', _ => adapter)

    prototype.__defineSetter__('adapter', _adapter => {
      PouchDB.prototype = _prototype
      adapter = _adapter
    })

    Object.assign(prototype, plugin._methods, {
      post:save,
      put:save,
      bulkDocs,
      _props:plugin._props
    })

    PouchDB.prototype = prototype

    //Can't just do validation through bulk docs because we are want to modify the body argument
    //with the validate library - .set() and .default() - and pouchdb clones args to prevent
    //that from happending.  Therefore we need to validate before sending to pouchdb
    function save(body, options, callback) {
      //Options is optional in pouchdb so check if it was left out
      if (typeof options == 'function') {
        callback = options
        options  = {}
      }

      const resolve  = success(callback)
      return validate([body], this._props, options).then(docs => {

        const valid  = validOnly(docs)
        if ( ! valid.length) throw docs[0]

        if (options) delete options.ctx

        //console.log('pouchdb-model', docs)

        const update = saved => updateDocs([body], docs, saved)[0]
        //calling bulkDocs prevents post/put going through validation twice.  And it makes the update
        //function more reusable.  However pouch's "put" method has some special hooks that we miss
        //this might cause subtle bugs down the road.
        //console.log('pouchdb._prototype.bulkDocs 1', valid, options)
        return _prototype.bulkDocs.call(this, valid, options).then(update).then(doc => {
          if (doc.error) throw doc
          else return doc
        })
      })
      .then(resolve, callback)
    }

    //Run validation before calling the super function
    function bulkDocs(body, options = {}, callback) {

      //Options is optional in pouchdb so check if it was left out
      if (typeof options == 'function') {
        callback = options
        options  = {}
      }

      const resolve  = success(callback)

      //Without the line below, _changes feed was not honoring longpolling and replication would
      //go on endlessly since pouch could not save items.  Unfortunately couch allows for new_edits
      //option to be passed either via body or via options (and pouch uses the former).
      if (body.new_edits != null)
        options.new_edits = body.new_edits

      return validate(body.docs || body, this._props, options).then(docs => {
        if (options) delete options.ctx
        const update = saved => {
          //console.log('pouchdb-model updating docs', body, docs, saved)
          return updateDocs(body.docs || body, docs, saved)
        }
        const valid = validOnly(docs)
        //console.log('pouchdb._prototype.bulkDocs 2', valid, options)
        return _prototype.bulkDocs.call(this, valid, options).then(update)
      })
      .then(resolve, callback)
    }


    function validate(body, props, options) {
      let docs = body.map(doc => specialDoc(doc) ? doc : validateDoc(doc, props, options))

      //Validate all docs againts our rules before proceeding.  Skip special docs
      return Promise.all(docs)
    }

    function validOnly(docs) {
      return docs.filter(doc => ! doc.error)
    }

    //Saved is usually mix of success and errors, but when new_edits=false
    //it is an array of only errors.  https://github.com/pouchdb/pouchdb/issues/2126
    //because of this discrepancy we can't rely on ordering and must search by _id
    //which is not very efficient but will never be wrong.  This is not quite to spec
    //because new_edits=false with no errors will return an array of docs rather than empty array
    function updateDocs(body, docs, saved) {
      for (const doc of saved)
        for (const i in docs) {
          //console.log('updateDocs', doc.id, docs[i]._id, body[i]._rev, doc.rev)
          if (doc.id == docs[i]._id && ! doc.error && ! docs[i].error) { //Don't add back error messages
            //console.log('pouchdb-model updateDocs', doc, docs[i])
            body[i]._rev = doc.rev //automatically update rev which is otherwise a pain. PouchDB clones post/put args so this won't help those methods
            docs[i] = doc
          }
        }

      return docs
    }

    function success(callback) {
      return docs => callback ? callback(null, docs) : docs
    }

    //PouchDB server takes and executes validate method
    //PouchDB model can accept rules that return promises

    function validateDoc(doc, props, opts) {

      let error = {errors:{}, message:[], doc, status:403, error:true}

      return Promise.all(Object.keys(props).map(key => {

        let prop = props[key]

        prop.values = getValues(doc, key)
        //Test each value to see if it passes this property's rules
        let propErrors = prop.values.map(val => isPropError(doc, opts, val, prop))
        //Wait for all rules to resolve
        return Promise.all(propErrors).then(propErrors => {
          //We don't need to save all errors for each rule just save if this property failed or not
          for (let err of propErrors)
            if (err) {
              error.errors[key] = prop
              error.message.push(prop.message)
            }
        })
      }))
      .then(_ => {
        if ( ! error.message.length) return doc

        console.log('pouchdb-model', doc, props, opts, error)
        //We use commas to collate accross errors for a single
        //property and use semicolons accross properties
        error.message = error.message.join('; ')
        return error //if any of the properties failed then return the error
      })
    }
  }

  plugin._props = {}

  plugin.ensure = function(key) {
    this._key = key
    this._props[key] = this._props[key] || {key, label:keyToLabel(key), rules:[], messages:[]}
    return this
  }

  plugin.label = function(label) {
    this._props[this._key].label = label
    return this
  }

  plugin.withMessage = function(message) {
    if (this._props[this._key].rules.length)
      this._props[this._key].rules[0].message = message
    else
      this._props[this._key].message = message

    return this
  }

  plugin._assert = function(rule) {
    this._props[this._key].rules.unshift(rule)
    return this
  }

  plugin.custom = function(rule) {

    function custom(doc, opts, val, key) {
      return (key && isNull(val)) || rule(doc, opts, val, key)
    }
    //Maintain rule name for easier debugging
    Object.defineProperty(custom, "name", {value:rule.name});
    Object.defineProperty(custom, "toString", {value:rule.toString.bind(rule)});

    return this._assert(custom)
  }

  plugin.required = function() {
    const required = (doc, opts, val) => ! isNull(val)
    return this._assert(required).withMessage(`is required`)
  }

  plugin.equals = function(value) {
    const equals = (doc, opts, val) => val === value
    return this.custom(equals).withMessage(`must be equal to ${value}`)
  }

  plugin.notEquals = function(value) {
    const notEquals = (doc, opts, val) => val !== value
    return this.custom(notEquals).withMessage(`must not be equal to ${value}`)
  }

  plugin.pattern = function(regex) {
    regex = regex instanceof RegExp ? regex : RegExp(regex)
    const pattern = (doc, opts, val) => regex.test(val)
    return this.custom(pattern).withMessage(`must match regex ${regex}`)
  }

  plugin.min = function(num) {
    //TODO make this work with dates and any other types that HTML5 validation accepts
    const min = (doc, opts, val) => val >= num
    return this.custom(min).withMessage(`must be ${num} or more`)
  }

  plugin.max = function(num) {
    const max = (doc, opts, val) => val <= num
    //TODO make this work with dates and any other types that HTML5 validation accepts
    return this.custom(max).withMessage(`must be ${num} or less`)
  }

  plugin.minLength = function(length) {
    const minLength = (doc, opts, val) => getLength(val) >= length
    return this.custom(minLength).withMessage(`must have a length of ${length} or more`)
  }

  plugin.maxLength = function(length) {
    const maxLength = (doc, opts, val) => getLength(val) <= length
    return this.custom(maxLength).withMessage(`must have a length of ${length} or less`)
  }

  plugin.typeEmail = function() {
    const typeEmail = (doc, opts, val) => /[\w._-]{2,}@[\w_-]{3,}\.(com|org|net|gov)/.test(val)
    return this.custom(typeEmail).withMessage(`must be a valid email`)
  }

  plugin.typeNumber = function() {
    const typeNumber = (doc, opts, val) => typeof val == 'number'
    return this.custom(typeNumber).withMessage(`must be a number`)
  }

  plugin.typeString = function() {
    const typeString = (doc, opts, val) => typeof val == 'string'
    return this.custom(typeString).withMessage(`must be a string`)
  }

  plugin.typeArray = function() {
    const typeArray = (doc, opts, val) => Array.isArray(val)
    return this.custom(typeArray).withMessage(`must be an array`)
  }

  plugin.typeObject = function() {
    const typeObject = (doc, opts, val) => typeof val == 'object' && ! Array.isArray(val)
    return this.custom(typeObject).withMessage(`must be an object`)
  }

  plugin.typeDate = function() {
    const typeDate = (doc, opts, val) => val == new Date(val).toJSON().slice(0, 10)
    return this.custom(typeDate).withMessage(`must be a valid json date`)
  }

  plugin.typeDateTime = function() {
    const typeDateTime = (doc, opts, val) => val == new Date(val).toJSON()
    return this.custom(typeDateTime).withMessage('must be a valid json datetime ')
  }

  plugin.typeTel = function() {
    return this.pattern(/\d{3}[-. ]?\d{3}[-. ]?\d{4}/).withMessage(`must be a 10 digit phone number delimited by - or .`)
  }

  //Sets the value as calculated
  plugin.set = function(fn) {
    const set = (doc, opts, val, key) => Promise.resolve(fn(doc, opts, val, key)).then(val => dotNotation(doc, key, val))
    return this._assert(set).withMessage('cannot be set. ${$error}')
  }

  //Sets the value if it is not already set
  plugin.default = function(fn) {
    const default_ = (doc, opts, val, key) => Promise.resolve(val || fn(doc, opts, val, key)).then(val => dotNotation(doc, key, val))
    return this._assert(default_).withMessage('cannot be set as default. ${$error}')
  }

  //Always valid but can trigger other functions
  plugin.trigger = function(fn) {
    const trigger_ = (doc, opts, val, key) => {
      fn(doc, opts, val, key)
      return Promise.resolve(true)
    }
    return this._assert(trigger_).withMessage('trigger function threw an error')
  }

  //Allow rules to be composable.  By reusing schema, helps with denormalized data
  plugin.rules = function(props) {
    props = props._props || props

    let prefix = this._key ? this._key+'.' : ''

    //Add the rules to this instance
    for (let key in props) {
      let current = this._props[prefix+key] || {}
       //Copy array so not a reference
      this._props[prefix+key] = {
        key:prefix+key,
        label:current.label || props[key].label,
        rules:props[key].rules.concat(current.rules || [])
      }
    }

    return this
  }

  //Create the PouchDB.  Save the rules.  Save the plugin
  plugin.methods = function(methods) {
    this._methods = methods
    return this
  }

  return plugin
}

//
//Hoisted helper functions
//


//We need to return an array of values for a given object and key because dot notation ignore arrays
//e.g, ensure('history._id').isNumber() for {history:[{_id:1, _id:2, _id:4}]} should get [1, 2, 4]
//in general we want to flatten arrays as above. The exception is when ending with an array so,
//for the same history object above, ensure('history').typeArray() would return true
//TODO can we reuse code from dotNotation()
function getValues(doc, key, debug) {

  debug && console.log('key', key, 'doc', doc)

  let vals = [doc]

  if ( ! key) return vals
  let keys = key.split('.')

  debug && console.log('keys', keys, 'doc', doc)

  for (let i in keys) {
    for (let j in vals) {

      debug && console.log('loop', 'i', i, keys.hasOwnProperty(i), 'j', j, vals.hasOwnProperty(j), 'vals[j]', vals[j], 'keys[i]', keys[i])

      //If path does not exist count value as
      //undefined and stop iterating this obj.
      //ignore aurelia set properties on array that for..in hits.  Can't do for(;vals.length;i++) because we maybe adding vals dynamically so length can change
      if ( ! keys.hasOwnProperty(i) || ! vals.hasOwnProperty(j) || ! vals[j]) continue

      let next = vals[j][keys[i]]

      debug && console.log('loop', 'i', i, 'j', j, 'next', next)

      //Flatten resulting array if it is in middle but not end of path
      //e.g., transaction.history._id would flatten since history is an
      //array but transaction.drug.generics would not since it ends as an array
      if (Array.isArray(next) && i < keys.length-1) {
        vals.splice(j, 1)
        vals = vals.concat(next)
        debug && console.log('has middle array', 'i', i, 'j', j, 'vals', vals)
      } else {
        vals[j] = next
      }
    }
  }


  return vals
}

function keyToLabel(key) {
  //Guesses property label based on the key. Split key based on a . or the next letter
  //being uppercase, then make each word uppercase.  you can override this by using label()
  return key ? key.split(/\.|(?=[A-Z])/g).map(word => word.charAt(0).toUpperCase()+word.slice(1)).join(' ') : null
}

function isPropError(doc, opts, value, prop) {
  let rules = prop.rules.map(rule => {
    try {


      let promise  = rule(doc, opts, value, prop.key)
      //Catch Asyncronous Errors
      return Promise.resolve(promise)
      .then(valid => {
        if ( ! valid) {
          console.error('Rule invalid', valid, prop.key, value, doc, opts, prop.message)
          //getValues(doc, prop.key, true)
        }
        return valid
      })
      .catch(err => {
        console.log('Asyncronous Rule Error', err)
        rule.message = 'Error calling '+rule
        prop.stack = err.stack.split('\n')
        return false
      })
    }
    //Catch Syncronous Errors
    catch(err) {
      console.log('Syncronous Rule Error', err)
      prop.stack = err.stack.split('\n')
      rule.message = 'Error calling '+rule
      return false
    }
  })

  return Promise.all(rules).then(valid => {
    //Save the message only if there is an error
    prop.messages = prop.rules
      .map(rule => typeof rule.message == 'object' ? JSON.stringify(rule.message) : (rule.message || rule.name))
      .filter((msg, i) => ! valid[i])

    if( ! prop.messages.length)
      return prop.error = false

    prop.message = message(prop, doc, JSON.stringify(value || null))

    return prop.error = true
  })
}

function message(prop, doc, value) {
  //if withMessage called after ensure() then it is an overall error message
  //but if it was called after a rule then join() all rule messages together
  if ( ! prop.message) {
    prop.message  = '${$property.label} ${$property.value} '
    prop.message += prop.messages.join(', ')
  }

  let ctx = Object.assign({$property:{key:prop.key, label:prop.label, value}}, doc)

  //Set the magic $property field available in messages
  return interpolate(prop.message, ctx)
}

//Simple parsing ${ that.can.handle.nested.objects }
function interpolate(str, doc) {
  return str.replace(/\$\{\s*(.+?)\s*\}/g, (_, match) => dotNotation(doc, match))
}

//getter and setter for
//"nested.properties.of.objects.with.strings.like.this"
function dotNotation(doc, path, val) {

  let old, next = doc, keys = path.split('.')

  for (var key of keys) {

    if ( ! next)
      throw Error(JSON.stringify(doc)+' does not contain '+path)

    old = next
    next = old[key]
  }

  //we could be setting val as null, undefined, 0, false etc
  if (arguments.length < 3)
    return next

  old[key] = val

  return true
}

function isNull(val) {
  return val == null || val === ''
}

function getLength(val) {
  if (val == null) return 0
  return (typeof val == 'number' ? String(val) : val).length
}

function specialDoc(doc) {
  if ( ! doc || typeof doc._id != 'string' ) return false // _id might calculated not be set yet. No doc if creating a database.  Don't validate _design/_local/_deleted docs
  return doc._id.startsWith('_design/') || doc._id.startsWith('_local/') || doc._id == '_security' || doc._deleted
}
