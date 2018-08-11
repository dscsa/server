"use strict"

let csv = require('csv/server')

exports.get = async function (ctx, name) {
  ctx.query.selector  = JSON.parse(ctx.query.selector)
  ctx.query.open_revs = JSON.parse(ctx.query.open_revs || "null")
  ctx.body = await ctx.db[name].get(ctx.query.selector.id, ctx.query)
}

//TODO replace this shim with a proxy once migrated to couchdb 2.0
exports.bulk_get = async function (ctx, name) {
  ctx.body = await ctx.db[name].bulkGet(Object.assign(ctx.query, ctx.req.body))
  //ctx.status = 400
  //ctx.body = '_bulk_get not implemented yet'
  // ctx.body = await ctx.req.body.docs.map(doc => {
  //   return ctx.db.user.get(doc.id, {rev:doc.rev,latest:true,revs:true})
  // })
}

exports.all_docs = async function (ctx, name) {
  ctx.body = await ctx.db[name].allDocs(Object.assign(ctx.query, ctx.req.body))
}

//CouchDB requires an _id based on the user's name
exports.post = async function (ctx, name) {
  ctx.body = await ctx.db[name].post(ctx.req.body, {ctx})
}

exports.put = async function (ctx, name, id) {
  console.log('put', name, ctx.req.body, id)
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
