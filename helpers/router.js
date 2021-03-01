"use strict"

let route = require('koa-route')

module.exports = function(app) {

  //create router object with methods for get/post, etc
  return function r(url, options) {

    //helper method used within each of the method of the router
    function performAction(method, handler) {

      app.use(route[method](url, wrapper, options))

      async function wrapper(ctx, ...args) {
        ctx.set('x-endpoint', ctx.headers.host+' '+method+' '+url+' for '+ctx.url)
        await handler.apply(this, [ctx, ...args])
      }
    }

    return {
      get(handler) {
        performAction('get', handler)
        return this
      },
      post(handler) {
        performAction('post', handler)
        return this
      },
      put(handler) {
        performAction('put', handler)
        return this
      },
      del(handler) {
        performAction('del', handler)
        return this
      },
      all(handler) {
        performAction('all', handler)
        return this
      }
    }
  }
}
