"use strict"
let http  = require('http')
let url   = require('url')

let count = 0, old, time //for use with couch.id

module.exports = defaults => {

  if ( ! defaults.middleware)
    return init(defaults, {})

  return function *(next) {
    this[defaults.middleware] = init(defaults, this)
    yield next
  }
}

function parseUrl(path) {
  path = path || {}
  return typeof path == 'string' ? url.parse(path) : path
}

function init(defaults, ctx) {

  //Right now {parse:true} is only option, eventually we can suppose {forms, json, multipart}
  function api(path, proxy) {
    path = parseUrl(path)

    let body, config = {
      hostname:path.hostname || defaults.hostname,
      port:path.port || (path.hostname ? null : defaults.port),
      method:(path.method || ctx.method).toUpperCase(),
      path:path.path || ctx.url, //this includes querystring
      headers:path.headers || ctx.req && ctx.req.headers,
      body:path.body || ctx.req
    }

    return {

      headers(headers) {
        config.headers = headers
        return this
      },

      body(body) {
        config.body = body
        delete config.headers['content-length'] //TODO only do this if body actually changed
        return this
      },

      then(a, b) {
        return Promise.all([config.headers, config.body])
        .then(all => {

          config.headers = all[0]
          config.body    = all[1]

          if (config.path[0] != '/')
            config.path = '/'+config.path

          var req = http.request(config)

          if(config.method == 'GET') //Don't drain req body with GET request
            req.end('')

          else if ( ! config.body)
            console.log(`Error: you forgot to set request body for ${config.method} ${config.path}`, config)

          else if ( ! config.body.pipe)
              req.end(JSON.stringify(config.body))

          else if ( ! config.body.readable)
            console.log(`Error: body's stream for ${config.method} ${config.path} is no longer readable.  Maybe you forgot to set the body to something else?`)

          else
            config.body.pipe(req, {end: true})

          return new Promise((resolve, reject) => {
            req.once('response', resolve)
            req.once('error', reject)
          })
        })
        .then(res => {
          if ( ! proxy)
            return api.json(res).then(body => {
              return {body, status:res.statusCode, headers:res.headers}
            })

          //console.log('path', res.statusCode, config.path)
          ctx.body    = res
          ctx.status  = res.statusCode
          ctx.set(res.headers)
        })
        .catch(err => console.log('this.couch error', err))
        .then(a,b)
      },

      catch(b) {
        return this.then(null, b)
      }
    }
  }

  api.get = (path, proxy) => {
    path = parseUrl(path)
    path.method = 'get'
    return api(path, proxy)
  }

  api.post = (path, proxy) => {
    path = parseUrl(path)
    path.method = 'post'
    return api(path, proxy)
  }

  api.put = (path, proxy) => {
    path = parseUrl(path)
    path.method = 'put'
    return api(path, proxy)
  }

  api.json = stream => {
    if (stream.body) //maybe this stream has already been collected.
      return Promise.resolve(stream.body)

    if (typeof stream.on != 'function') //ducktyping http://stackoverflow.com/questions/23885095/nodejs-check-if-variable-is-readable-stream
      return console.log(new Error('http.json was not given a stream').stack, stream)

    if ( ! stream.readable)
      return console.log(new Error('http.json stream is already closed').stack, stream)

    stream.body = ''
    return new Promise((resolve, reject) => {
      stream.on('error', reject)
      stream.on('data', data => stream.body += data)
      stream.on('end', _ => resolve(JSON.parse(stream.body || '{}'))) //default to {} this is what other body parsers do in strict mode.  Not sure what we want to do here.
    })
  }

  api.body = {
    then(a,b) {
      return api.json(ctx.req).then(a,b)
    }
  }

  //Return a 7 digit uuid that can handle upto 36^2/47 = 27 requests per second
  Object.defineProperty(api, 'id', {
    get() {
      old   = time
      time  = Date.now().toString(36).slice(-8, -3) //5 digit timestamp. Updates ever 36^3/1000 = 47 seconds and doesn't repeat for 36^8/1000 = 89 years
      count = time == old ? count+1 : 0
      return time+("00"+count.toString(36)).slice(-2) //Force Id to 2 digits (36^2 updates per time period).  Overall uuid is 7 digits
    }
  })

  return api
}
