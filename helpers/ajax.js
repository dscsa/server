const ajax = require('../../pouchdb-ajax')

module.exports = defaults => {
  return opts => {
    const options = Object.assign(defaults || {}, {
      url:opts.url,
      headers:opts.headers,
      method:opts.method,
      timeout:opts.timeout,
      auth:opts.auth,
      body:opts.pipe && ! opts.body ? opts : opts.body
    })

    if ( ~ options.url.indexOf('//'))
      delete options.baseUrl

    //TODO share this code with client?
    //Promisify request object but don't lose ability to stream it
    //PouchDB's ajaxCore makes there be a callback even if not needed
    //this means that request collects the body and adds to response
    let resolve
    let reject
    const promise = new Promise((res, rej) => { resolve = res, reject = rej })
    const stack = new Error().stack

    const request = ajax(options, (err, body) => {

      if ( ! err) return resolve(body)

      if (err.code != 500) return reject(err)

      err.stack += '\n'+stack
      console.log('err', err.stack)
    })

    //Do we still need the below?
    //delete stream.headers['access-control-expose-headers'] //this was overriding our index.js default CORS headers.

    request.then = promise.then.bind(promise)
    request.catch = promise.catch.bind(promise)

    return request
  }
}
