"use strict"

let csv = require('csv/server')

exports.get = async function (ctx, name) {
  ctx.query.selector  = csv.parseJSON(ctx.query.selector)
  ctx.query.open_revs = csv.parseJSON(ctx.query.open_revs)
  ctx.body = await ctx.db[name].get(ctx.query.selector.id, ctx.query)
}

exports.bulk_get = async function (ctx, name) {
  ctx.body = await ctx.db[name].bulkGet(Object.assign(ctx.query, ctx.req.body))
}

exports.all_docs = async function (ctx, name) {
  ctx.body = await ctx.db[name].allDocs(Object.assign(ctx.query, ctx.req.body))
}

//CouchDB requires an _id based on the user's name
exports.post = async function (ctx, name) {
  ctx.body = await ctx.db[name].post(ctx.req.body, {ctx})
}

exports.put = async function (ctx, name, id) {
  ctx.body = await ctx.db[name].put(ctx.req.body, {ctx}).then(doc => {
    console.log('put doc', doc)
    return doc
  })
  .catch(doc => {
    console.log('put catch', doc)
    return doc
  })
}

//TODO this doesn't work when adding new docs to models like shipment that have an _id with only
//1 second resolution.  The first doc is saved but the other docs are ignored since _id is same
exports.bulk_docs = async function (ctx, name) {
  try {
    ctx.body = await ctx.db[name].bulkDocs(ctx.req.body, {ctx})
  } catch (err) {
    console.log('bulk docs err', name, ctx.req.body, err)
  }
}

exports.del = async function (ctx, name, id) {
  ctx.body = await ctx.db[name].remove(id, ctx.query.rev)
}

exports.isNew = function(doc, opts) {
  let isNew = ! doc._rev || (doc._rev.split('-')[0] == 1 && opts.new_edits === false)
  isNew && console.log('isNew',  doc._id, doc._rev, opts.new_edits, doc)
  return isNew
}
