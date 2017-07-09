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

    //TODO share this code with client?
    //Promisify request object but don't lose ability to stream it
    //PouchDB's ajaxCore makes there be a callback even if not needed
    //this means that request collects the body and adds to response
    const request = ajax(options, _ => null)
    const promise = new Promise((resolve, reject) => {
      request.on('response', response => {
        delete response.headers['access-control-expose-headers'] //this was overriding our index.js default CORS headers.
        setTimeout(_ => resolve(response), 20) //is there a better way to 1) return stream 2) but wait for body property to be set
      })
      const stack = new Error().stack
      request.on('error', err => {
        err.stack += '\n'+stack
        console.log('err', err)
        reject(err)
      })
    })

    request.then = promise.then.bind(promise)
    request.catch = promise.catch.bind(promise)

    return request
  }
}
