"use strict"

exports.validate_doc_update = function(newDoc, oldDoc, userCtx) {

  if (newDoc._id.slice(0, 7) == '_local/') return

  ensure.prefix = 'shipment'

  //Required
  ensure('_id').assert(_id)
  ensure('createdAt').notNull.isDate.notChanged
  ensure('from.name').notNull.isString
  ensure('to.name').notNull.isString

  //Optional
  ensure('pickupAt').isDate
  ensure('shippedAt').isDate
  ensure('receivedAt').isDate
  ensure('verifiedAt').isDate

  function _id(val) {

    val = val.split('.')

    if (val[0] != userCtx.roles[0] && val[1] != userCtx.roles[0])
      return "must contain your account._id as its only, first, or second segment"

    if (val.length == 1 && val[0] == account.from._id) return

    if (val[0] == val[1])
      return 'cannot have account.from._id == account.to._id'

    if (val.length == 3 && id.test(val[2])) {
      if (val[0] == account.from._id && id.test(val[1])) return
      if (val[1] == account.to._id && id.test(val[0])) return
    }

    return 'must be in the format <account.from._id> or <account.from._id>.<account.to._id>.<_id>'
  }
}

//Note ./startup.js saves views,filters,and shows as toString into couchdb and then replaces
//them with a function that takes a key and returns the couchdb url needed to call them.
exports.filter = {
  authorized(doc, req){

    if (doc._id.slice(0, 7) == '_design') return

    var account  = req.account || req.userCtx.roles[0]
    var accounts = doc._id.split('.')

    return accounts[0] == account || accounts[1] == account
  }
}

exports.view = {
  authorized(doc) {
    var accounts = doc._id.split('.')
    emit(accounts[0], {rev:doc._rev})
    emit(accounts[1], {rev:doc._rev})
  }
}

exports.show = {
  authorized(doc, req) {
    if ( ! doc) return
    var account  = req.account || req.userCtx.roles[0]   //called from PUT or CouchDB
    var accounts = doc._id.split('.')

    if (accounts[0] == account || accounts[1] == account)
      return toJSON([{ok:doc}])
  }
}

exports.changes = function* (db) {
  yield this.http(exports.filter.authorized(this.url), true)
}

exports.list = function* () {
  yield this.http(exports.view.authorized(), true)
}

exports.get = function* (id) {
  yield this.http(exports.show.authorized(id), true)
}

exports.bulk_get = function* (id) {
  this.status = 400
}

exports.post = function* () { //TODO querystring with label=fedex creates label, maybe track=true/false eventually

  this.body = yield this.http.body

  //TODO replace this with an Easy Post API call that actually creates a label
  //TODO create pickup for the next business date
  this.body.tracking  = Math.floor(Math.random() * (99999-10000))+10000,
  this.body.createdAt = new Date().toJSON()

  //Complicated id is not need for shipment, but is needed for transaction that references shipment
  //this way a list function ensure transactions are only provided to the correct from/to accounts
  let id  = `${this.body.account.from._id}.${this.body.account.to._id}.${this.http.id}`
  let res = yield this.http.put('shipments/'+id).body(this.body)

  this.status = res.status

  if (this.status != 201)
    return this.body = res.body

  this.body._id  = res.body.id
  this.body._rev = res.body.rev
}

exports.put = function* () {
  yield this.http(null, true)
}

exports.bulk_docs = function* () {
  yield this.http(null, true)
}

exports.delete = function* (id) {

  yield this.http.get('shipments/'+id, true)

  if (this.status == 200)
    yield this.http.delete(`/shipments/${id}?rev=${shipment.body._rev}`, true)
}

exports.shipped = function* (id) {
  this.status = 501 //not implemented
}
exports.received = function* (id) {
  this.status = 501 //not implemented
}
exports.pickup = {
  *post(id) {
    this.status = 501 //not implemented
  },
  *delete(id) {
    this.status = 501 //not implemented
  }
}
exports.manifest = {
  *get(id) {
    this.status = 501 //not implemented
  },
  *delete(id) {
    this.status = 501 //not implemented
  }
}
