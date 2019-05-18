"use strict"

let route = require('koa-route')

module.exports = function(app) {

  return function r(url, options) {

    function router(method, handler) {

      app.use(route[method](url, wrapper, options))

      async function wrapper(ctx, ...args) {
        ctx.set('x-endpoint', ctx.headers.host+' '+method+' '+url+' for '+ctx.url)
        await handler.apply(this, [ctx, ...args])
      }
    }

    return {
      get(handler) {
        router('get', handler)
        return this
      },
      post(handler) {
        router('post', handler)
        return this
      },
      put(handler) {
        router('put', handler)
        return this
      },
      del(handler) {
        router('del', handler)
        return this
      },
      all(handler) {
        router('all', handler)
        return this
      }
    }
  }
}
