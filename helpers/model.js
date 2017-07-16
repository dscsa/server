"use strict"

let csv = require('csv/server')

exports.get = function* (name) {
  this.query.selector  = JSON.parse(this.query.selector)
  this.query.open_revs = JSON.parse(this.query.open_revs)
  this.body = yield this.db[name].get(this.query.selector.id, this.query)
}

//TODO replace this shim with a proxy once migrated to couchdb 2.0
exports.bulk_get = function* () {
  this.status = 400
  this.body = '_bulk_get not implemented yet'
  // this.body = yield this.req.body.docs.map(doc => {
  //   return this.db.user.get(doc.id, {rev:doc.rev,latest:true,revs:true})
  // })
}

exports.all_docs = function* (name) {
  this.body = yield this.db[name].allDocs(Object.assign(this.query, this.req.body))
}

//CouchDB requires an _id based on the user's name
exports.post = function* (name) {
  this.body = yield this.db[name].post(this.req.body, {this:this})
}

exports.put = function* (name, id) {
  console.log('put', name, this.req.body, id)
  this.body = yield this.db[name].put(this.req.body, {this:this}).then(doc => {
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
exports.bulk_docs = function* (name) {
  try {
    this.body = yield this.db[name].bulkDocs(this.req.body, {this:this})
  } catch (err) {
    console.log('bulk docs err', name, this.req.body, err)
  }
}

exports.del = function* (name, id) {
  this.body = yield this.db[name].remove(id, this.query.rev)
}

exports.isNew = function(doc, opts) {
  return ! doc._rev || (doc._rev.split('-')[0] == 1 && opts.new_edits === false)
}
