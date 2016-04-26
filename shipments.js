"use strict"

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
