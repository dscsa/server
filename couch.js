"use strict"
let http  = require('http')
let count = 0, old, time //for use with couch.id

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
