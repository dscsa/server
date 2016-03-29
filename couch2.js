"use strict"
let http  = require('http')

module.exports = defaults => {
  let fluent = init(defaults)
  let api    = fluent({})

  api.use = function* couch(next) {
    this.couch = fluent(this)
    yield next
  }

  return api
}

function init(defaults) {
  return ctx => {
    //Right now {parse:true} is only option, eventually we can suppose {forms, json, multipart}
    function api(opts) {
      opts = opts || {}
      let body, config = {
        hostname:opts.hostname || defaults.hostname,
        port:opts.port || defaults.port,
        method:(opts.method || ctx.method).toUpperCase(),
        path:ctx.url, //this includes querystring
        headers:ctx.req && ctx.req.headers,
        body:ctx.req
      }

      return {
        url(url) {
          config.path = typeof url == 'string'
            ? url : api.json(config.body).then(json => url(json.body))

          return this
        },

        headers(headers) {
          config.headers = typeof headers == 'object'
            ? headers : headers(config.headers) || config.headers

          return this
        },

        body(body) {
          config.body = typeof body == 'object'
            ? body : api.json(config.body).then(json => body(json.body) || json.body)

          delete config.headers['content-length'] //TODO only do this if body actually changed
          return this
        },

        then(a, b) {
          return Promise.all([config.path, config.headers, config.body])
          .then(all => {
            config.path    = all[0]
            config.headers = all[1]
            config.body    = all[2]

            return new Promise(function(resolve, reject) {
              var req = http.request(config)
              req.once('response', resolve)
              req.once('error', reject)

              if(config.method == 'GET') //Don't drain req body with GET request
                return req.end('')

              if(config.body && config.body.pipe) {
                return config.body.pipe(req, {end: true})
              }

              req.end(config.body ? JSON.stringify(config.body) : '')
            })
          })
          .then(res => {

            if (ctx.throw && res.statusCode >= 300) //Don't swallow server errors) //if not running as middleware then ctx === {}
              return ctx.throw(res.statusCode, res.message+" "+config.path+" "+ctx.url)

            if ( ! opts.proxy)
              return api.json(res)

            //console.log('path', res.statusCode, config.path)
            ctx.body   = res
            ctx.status = res.statusCode
            for (var i in res.headers)
              ctx.set && ctx.set(i, res.headers[i]) //if not running as middleware then ctx === {}
          })
          .catch(err => console.log(err))
          .then(a,b)
        }
      }
    }

    api.get = opts => {
      opts = opts || {}
      opts.method = 'get'
      return api(opts)
    }

    api.post = opts => {
      opts = opts || {}
      opts.method = 'post'
      return api(opts)
    }

    api.put = opts => {
      opts = opts || {}
      opts.method = 'put'
      return api(opts)
    }

    api.json = stream => {
      if (stream.body) //maybe this stream has already been collected.
        return Promise.resolve(done(stream))

      if ( ! stream.readable)
        console.log(new Error('couch.json stream is already closed').stack)

      var body = ''
      return new Promise((resolve, reject) => {
        stream.on('error', reject)
        stream.on('data', function(data) { body += data })
        stream.on('end', function() {
          stream.body = body ? JSON.parse(body) : {} //default to {} this is what other body parsers do in strict mode.  Not sure what we want to do here.
          resolve(done(stream))
        })
      })

      function done(stream) {
        return {
          status:stream.statusCode,
          headers:stream.headers,
          body:stream.body
        }
      }
    }

    var count = 0, old, time
    //Return a 7 digit uuid that can handle upto 36^2/47 = 27 requests per second
    api.id  = () => {
      old   = time
      time  = Date.now().toString(36).slice(-8, -3) //5 digit timestamp. Updates ever 36^3/1000 = 47 seconds and doesn't repeat for 36^8/1000 = 89 years
      count = time == old ? count+1 : 0
      return time+("00"+count.toString(36)).slice(-2) //Force Id to 2 digits (36^2 updates per time period).  Overall uuid is 7 digits
    }

    return api
  }
}

//couch(this).url(this.url, [method=same]).body(this.body, [append=true]).headers(this.headers, [append=true]).proxy([headers=true], [body=true])
// function couch(ctx, method) {
//   var options = {
//     hostname:'localhost',
//     port: 5984,
//     path: ctx.url, //this includes querystring
//     method: method || ctx.method,
//     headers: ctx.req && ctx.req.headers
//   }
//   var proxy = {status:true ,headers:true, body:true}
//
//   var result = {
//     path(path, append) {
//       options.path = append ? options.path.replace(/\?|$/, path+'?') : path
//       return result
//     },
//     body(body, append) {
//       options.append = append
//       options.body = body
//       return result
//     },
//
//     headers(headers, append) {
//       if ( ! append) {
//         options.headers = headers
//       }
//       else {
//         for (var i in headers)
//           options.headers[i] = headers[i]
//       }
//       return result
//     },
//
//     proxy(body, status, headers) {
//       proxy.body    = body
//       proxy.status  = status
//       proxy.headers = headers
//       return result
//     },
//
//     then(success, failure) {
//       return new Promise(function(resolve, reject) {
//         delete options.headers['content-length'] //TODO only do this if body actually changed
//         options.path = options.path.replace('/users', '/_users')
//         var req = http.request(options)
//         req.once('response', resolve)
//         req.once('error', reject)
//
//         if(options.method == 'GET') //Don't drain req body with GET request
//           return req.end('')
//
//         if( ! options.body && ctx.req && ctx.req.pipe) {
//           //console.log('req.pipe', options.method, options.path)
//           return ctx.req.pipe(req, {end: true})
//         }
//
//         Promise.resolve()
//         .then(function() {
//           if (options.append == null)
//             return null
//
//           if ( ! ctx.req)
//             console.log(new Error('if body append is not null, then this.req must be set').stack)
//
//           return ctx.req.body || couch.json(ctx.req)
//         })
//         .then(function(body) {
//           //Append === false:  options has default values only to be set if body's value is null
//           //Append === true:  options values should overwrite the original body
//           //Append == null/undefined: use the options as the body, do not append to original
//           if (options.append != null) {
//             for (var i in options.body) {
//               if (options.append || body[i] == null)
//                 body[i] = options.body[i]
//             }
//             options.body = body
//           }
//           req.end(JSON.stringify(options.body))
//         })
//         .catch(function(err) {
//           console.log(err.stack) //Doesn't log errors otherwise
//         })
//       })
//       .then(function(res) {
//
//         if (proxy.status)
//           ctx.status = res.statusCode
//
//         if (proxy.headers) {
//           for (var i in res.headers)
//             ctx.set(i, res.headers[i])
//         }
//         //If we supply a body, return it.  Helpful when adding default properties in POST
//         if (res.statusCode >= 500 || (proxy.body && ! options.body)) //Don't swallow errors
//           return ctx.body = res
//
//         return couch.json(res)
//         .then(function(doc) {
//
//           //This is only helpful for put and post of object
//           //(so we any defaults or edits that we made before saving)
//           //TODO move this into the applicable database files that set defaults?
//           if (options.body && ! ~ options.path.indexOf('_bulk_docs')) {
//             options.body._id  = doc.id
//             options.body._rev = doc.rev
//             doc = options.body
//           }
//           if ( ! proxy.body)
//             return doc
//
//           ctx.body = doc
//         })
//       })
//       .then(success, failure)
//     }
//   }
//   return result
// }
//
// couch.json = function(req) {
//
//   if ( ! req.readable)
//     console.log(new Error('couch.json req is already closed').stack)
//
//   var body = ''
//   return new Promise(function(resolve, reject) {
//     req.on('error', reject)
//     req.on('data', function(data) { body += data })
//     req.on('end', function() { resolve(JSON.parse(body || null)) })
//   })
// }
//
// couch.list = function* (){
//   var path = '/_design/auth/_list/all/authorized?include_docs=true&key=":key"'
//   yield couch(this).path(path.replace(':key', this.cookies.get('AuthAccount')), true)
// }
//
// var count = 0, old, time
// //Return a 7 digit uuid that can handle upto 36^2/47 = 27 requests per second
// couch.id = function() {
//   old   = time
//   time  = Date.now().toString(36).slice(-8, -3) //5 digit timestamp. Updates ever 36^3/1000 = 47 seconds and doesn't repeat for 36^8/1000 = 89 years
//   count = time == old ? count+1 : 0
//   return time+("00"+count.toString(36)).slice(-2) //Force Id to 2 digits (36^2 updates per time period).  Overall uuid is 7 digits
// }
//
// //TODO expose patch here or keep as internal method only?
// couch.doc = function*() {
//   if (this.method == 'POST')
//     this.status = 405
//   else if (this.method == 'PATCH')
//     this.status = 405
//   else
//     yield couch(this)
// }
//
// couch.proxy = function* () {
//   yield couch(this)
// }
//
// couch.changes = function* (db) {
//   this.query.filter = 'auth/account'
//   yield couch(this)
// }
