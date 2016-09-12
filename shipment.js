"use strict"

exports.lib = {
  validShipmentId(val, newDoc, userCtx) {
    val = val.split('.')

    if (val[0] == val[1])
      return 'cannot have account.from._id == account.to._id'

    if (require('isRole')(newDoc, userCtx)) {
      if(val.length == 1) return
      if(val.length == 3 && /^[a-z0-9]{7}$/.test(val[2])) return
    }

    return 'must be a string in the format "account.from._id" or "account.from._id"."account.to._id"."_id"'
  }
}


exports.docRoles = function(doc, emit) {
  //Determine whether user is authorized to see the doc
  doc._deleted ? emit() : doc._id.split('.').slice(0, 2).forEach(emit)
}

exports.userRoles = (ctx, emit) => {
  ctx.session && emit(ctx.session.account._id)
}

exports.validate = function(newDoc, oldDoc, userCtx) {

  var id = /^[a-z0-9]{7}$/
  var ensure = require('ensure')('shipment', arguments)
  var validShipmentId = require('validShipmentId')

  //Required
  ensure('_id').isString.assert(validShipmentId)
  ensure('createdAt').notNull.isDate.notChanged
  ensure('account.from.name').notNull.isString
  ensure('account.to.name').notNull.isString

  //Optional
  ensure('pickupAt').isDate
  ensure('shippedAt').isDate
  ensure('receivedAt').isDate
  ensure('verifiedAt').isDate
}

exports.get = function* () {
  let s = JSON.parse(this.query.selector)
  console.log('shipment get', this.query.open_revs)
  //TODO remove this once bulk_get is supported and we no longer need to handle replication through regular get
  if (s._id)
    return yield this.query.open_revs
      ? this.http.get('shipment/'+s._id)
      : this.shipment.list.id(s._id)
}

exports.post = function* () { //TODO querystring with label=fedex creates label, maybe track=true/false eventually

  this.body = yield this.http.body

  //TODO replace this with an Easy Post API call that actually creates a label
  //TODO create pickup for the next business date
  this.body.tracking  = this.body.tracking || Math.floor(Math.random() * (99999-10000))+10000,
  this.body.createdAt = new Date().toJSON()

  //Complicated id is not need for shipment, but is needed for transaction that references shipment
  //this way a list function ensure transactions are only provided to the correct from/to accounts
  let _id = `${this.body.account.from._id}.${this.body.account.to._id}.${this.http.id}`
  let save = yield this.http.put('shipment/'+_id, this.body).body

  this.body._id  = save.id
  this.body._rev = save.rev
}

exports.put = function* () {
  yield this.http()
}

exports.bulk_docs = function* () {
  yield this.http()
}

exports.delete = function* () {
  yield this.http()
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
