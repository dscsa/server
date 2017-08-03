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
    let status
    let headers
    const promise = new Promise((res, rej) => { resolve = res, reject = rej })
    const stack = new Error().stack

    const request = ajax(options, (error, body, res) => {

      if (error && error.code == 500) {
        error.stack += '\n'+stack
        console.log('error', error.stack)
        return reject(error)
      }

      return resolve({body, error, headers:res && res.headers, status:res ? res.statusCode : error.status})
    })

    // request.on('response', res => {
    //   headers = res.headers
    //   statuscode =
    // })


    //Do we still need the below?
    //delete stream.headers['access-control-expose-headers'] //this was overriding our index.js default CORS headers.

    request.then = promise.then.bind(promise)
    request.catch = promise.catch.bind(promise)

    return request
  }
}
