"use strict"
let httpRequest = require('http').request
let urlParse    = require('url').parse
let qsString    = require('querystring').stringify

let count = 0, old, time //for use with couch.id

//Since http is ansyncronous, we throw more meaningful errors by
//saving the stack when API is run and then appending it at end
function asyncError(err, status) {
  let asyncErr = Error(JSON.stringify(err))
  asyncErr.name    = err.name || asyncErr.name
  asyncErr.message = err.reason || asyncErr.message
  asyncErr.status  = status
  asyncErr.stack  += httpFactory.stack
  return asyncErr
}

function parseUrl(url) {
  if (typeof url == 'string') //settings is already be an object
    url = urlParse(url, true)

  if (url.pathname && url.pathname[0] != '/')
    url.pathname = '/'+url.pathname //force relative paths to be absolute

  return {
    //protocol:url.protocol, //TODO node http.request does not support https, need to https module
    host:url.host,
    pathname:url.pathname,
    query:url.query
  }
}

function getDefaults(userUrl = {}, defaultUrl = {}, ctxUrl = {}) {

  //Object assign will overwrite with null, so we must do manually
  let protocol = userUrl.protocol || defaultUrl.protocol || ctxUrl.protocol
  let host  = userUrl.host || defaultUrl.host || ctxUrl.host
  let path  = userUrl.pathname || defaultUrl.pathname || ctxUrl.pathname
  let query = userUrl.query || defaultUrl.query || ctxUrl.query

  //TODO do not forward headers if user.host is specified either, right now getGoodRx & getNadac must set .headers()
  if ( ! userUrl.host) //Only proxy querystrings if user does not specify a host
    query = Object.assign({}, ctxUrl && ctxUrl.query, defaultUrl.query, userUrl.query)

  let [hostname, port] = host.split(':') //http.request needs "port" prop
  path += '?'+qsString(query)            //http.request needs "path" prop

  return { hostname, port, path } //protocol
}

function getHeaders(userHeaders, defaultHeaders, ctxHeaders) {
  let headers = Object.assign({}, ctxHeaders, defaultHeaders, userHeaders)
  if (headers['authorization']) delete headers['cookie'] //cookie takes precendence, but we need it not to for /_user calls
  delete headers['content-length']
  return headers
}

function makeConfig(user, settings, ctx) {
  let config = getDefaults(parseUrl(user.url || ''), settings.parsedUrl, ctx.parsedUrl)
  config.headers = getHeaders(user.headers, settings.headers, ctx.headers)
  config.method  = (user.method || settings.method || ctx.method).toUpperCase()
  config.body    = user.body || settings.body || ctx.body
  return Promise.resolve(config)
}

module.exports = settings => {

  let middleware = settings.middleware

  settings = {
    headers    : settings.headers,
    body       : settings.body,
    parsedUrl  : parseUrl(settings)
  }

  if ( ! middleware)
    return httpFactory(settings)

  return function *(next) {
    this.body       = this.req,
    this.parsedUrl  = parseUrl(this.url)

    this[middleware] = httpFactory(settings, this)
    yield next
  }
}

function httpFactory(settings, ctx = {}) {
  function http(url, body) {
    httpFactory.stack = Error().stack

    let user = {url, body, proxy:true}, api = {
      method(method) {
        user.method = method
        return api
      },

      headers(headers) {
        user.headers = headers || {} //headers cannot be undefined or request will hang
        return api
      },

      catch(reject) {
        return api.then(null, reject)
      },

      then(resolve, reject) {
        return makeConfig(user, settings, ctx)
          .then(request)
          .then(response.bind({proxy:user.proxy}))
          .then(resolve, reject)
      }
    }

    Object.defineProperty(api, 'body', {
      get() {
        user.proxy = false
        return api
      }
    })

    return api
  }

  http.get = path => http(path).method('get')

  http.post = (path, body) => http(path, body).method('post')

  http.put = (path, body) => http(path, body).method('put')

  http.delete = (path, body) => http(path, body).method('delete')

  http.json = stream => {

    if (stream.body) //maybe this stream has already been collected.
      return Promise.resolve(stream.body)

    if (typeof stream.on != 'function') //ducktyping http://stackoverflow.com/questions/23885095/nodejs-check-if-variable-is-readable-stream
      throw asyncError('http.json was not given a stream')

    if ( ! stream.readable)
      throw asyncError('http.json stream is already closed')

    stream.body = ''
    return new Promise((resolve, reject) => {
      stream.on('error', err => reject(asyncError(err)))
      stream.on('data', data => stream.body += data)
      stream.on('end', _ => {
        try {
          resolve(JSON.parse(stream.body || '{}'))
        } catch (err) {
          reject(asyncError('Error: Invalid JSON '+stream.body))
        }
      }) //default to {} this is what other body parsers do in strict mode.  Not sure what we want to do here.
    })
  }

  //Return a 7 digit uuid that can handle upto 36^2/47 = 27 requests per second
  Object.defineProperty(http, 'body', {
    get() {
      return http.json(ctx.body)
    }
  })

  //Return a 7 digit uuid that can handle upto 36^2/47 = 27 requests per second
  Object.defineProperty(http, 'id', {
    get() {
      old   = time
      time  = Date.now().toString(36).slice(-8, -3) //5 digit timestamp. Updates ever 36^3/1000 = 47 seconds and doesn't repeat for 36^8/1000 = 89 years
      count = time == old ? count+1 : 0
      return time+("00"+count.toString(36)).slice(-2) //Force Id to 2 digits (36^2 updates per time period).  Overall uuid is 7 digits
    }
  })

  return http

  function request(config) {
    //console.log('httpRequest', config.method, config.hostname, config.port, config.path)
    var req = httpRequest(config)

    if(config.method == 'GET')
      req.end('')  //Don't drain req body with GET request

    else if ( ! config.body) //Delete requests have optional body, put for couch db creation is another without body
      req.end('') && console.warn(`You forgot to set request body for ${config.method} ${config.path}`)

    else if ( ! config.body.pipe)
      req.end(JSON.stringify(config.body))

    else if ( ! config.body.readable)
      throw asyncError(`body's stream for ${config.method} ${config.path} is no longer readable.  Did you forget to set the body?`)

    else
      config.body.pipe(req, {end: true})

    return new Promise((resolve, reject) => {
      req.once('response', resolve)
      req.once('error', reject)
    })
  }

  function response(res) {

    if (ctx.url != res.req.path)
      console.log('response', ctx.url, res.req.path)
      
    ctx.status = res.statusCode //Always proxy the status code

    //console.log('http response', res.req.method, res.req.path, res.statusCode, res.statusMessage, this.proxy)
    if (res.statusCode >= 500)
      return http.json(res).then(body => {
        throw asyncError(body, res.statusCode)
      })

    //While not an error per-se, no proxy means we are relying on a result that based
    //on the status codes most likely did not come.  Better to throw out of normal flow
    if ( ! this.proxy && (res.statusCode < 200 || res.statusCode >= 300))
      throw http.json(res)

    if ( ! this.proxy)
      return http.json(res)

    if (ctx.set && ! ctx.headerSent) {
      ctx.set(res.headers)
      ctx.body = res
    }
  }
}
