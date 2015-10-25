var http  = require('http')

//Must be raw node request not Koa's this.request
module.exports = couch

//couch(this).url(this.url, [method=same]).body(this.body, [append=true]).headers(this.headers, [append=true]).proxy([headers=true], [body=true])
function couch(ctx, method) {
  var options = {
    hostname:'localhost',
    port: 5984,
    path: ctx.url, //this includes querystring
    method: method || ctx.method,
    headers: ctx.headers
  }
  var proxy = {status:true ,headers:true, body:true}

  var result = {
    path(path, append) {
      options.path = append ? options.path.replace(/\?|$/, path+'?') : path
      return result
    },
    body(body, append) {
      options.append = append
      options.body = body
      return result
    },

    headers(headers, append) {
      if ( ! append) {
        options.headers = headers
      }
      else {
        for (var i in headers)
          options.headers[i] = headers[i]
      }
      return result
    },

    proxy(body, status, headers) {
      proxy.body    = body
      proxy.status  = status
      proxy.headers = headers
      return result
    },

    then(success, failure) {
      return new Promise(function(resolve, reject) {
        delete options.headers['content-length'] //TODO only do this if body actually changed
        options.path = options.path.replace('/users', '/_users')
        var req = http.request(options)
        req.once('response', resolve)
        req.once('error', reject)

        if(options.method == 'GET') //Don't drain req body with GET request
          return req.end('')

        if( ! options.body && ctx.req && ctx.req.pipe) {
          //console.log('req.pipe', options.method, options.path)
          return ctx.req.pipe(req, {end: true})
        }

        Promise.resolve()
        .then(function() {
          if (options.append == null)
            return null

          if ( ! ctx.req)
            console.log(new Error('if body append is not null, then this.req must be set').stack)

          return ctx.req.body || couch.json(ctx.req)
        })
        .then(function(body) {
          for (var i in body) {
            if ( ! options.append || ! options.body[i]) //append == false should be a default val (i.e. not overwrite)
              options.body[i] = body[i]
          }
          req.end(JSON.stringify(options.body))
        })
      })
      .then(function(res) {
        if (proxy.status)
          ctx.status = res.statusCode

        if (proxy.headers) {
          for (var i in res.headers)
            ctx.set(i, res.headers[i])
        }

        if (proxy.body || res.statusCode >= 500) //Don't swallow errors
          return ctx.body = res

        return couch.json(res)
        .then(function(doc) {
           //Default return value is the request val.  Helpful for PUT/POST
          if ( ~ ['POST', 'PUT'].indexOf(options.method)) {
            options.body._id  = doc.id
            options.body._rev = doc.rev
            doc = options.body
          }
          return doc
        })
      })
      .then(success, failure)
    }
  }
  return result
}

couch.json = function(req) {

  if ( ! req.readable)
    console.log(new Error('couch.json req is already closed').stack)

  var body = ''
  return new Promise(function(resolve, reject) {
    req.on('error', reject)
    req.on('data', function(data) { body += data })
    req.on('end', function() { resolve(JSON.parse(body || null)) })
  })
}

couch.list = function* (){
  var path = '/_design/auth/_list/all/authorized?include_docs=true&key=":key"'
  yield couch(this).path(path.replace(':key', this.cookies.get('AuthAccount')), true)
}

var count = 0, old, time
//Return a 7 digit uuid that can handle upto 36^2/47 = 27 requests per second
couch.id = function() {
  old   = time
  time  = Date.now().toString(36).slice(-8, -3) //5 digit timestamp. Updates ever 36^3/1000 = 47 seconds and doesn't repeat for 36^8/1000 = 89 years
  count = time == old ? count+1 : 0
  return time+("00"+count.toString(36)).slice(-2) //Force Id to 2 digits (36^2 updates per time period).  Overall uuid is 7 digits
}

//TODO expose patch here or keep as internal method only?
couch.doc = function*() {
  if (this.method == 'POST')
    this.status = 405
  else if (this.method == 'PATCH')
    this.status = 405
  else
    yield couch(this)
}

couch.proxy = function* () {
  yield couch(this)
}

couch.changes = function* (db) {
  this.query.filter = 'auth/account'
  yield couch(this)
}
