"use strict"

exports.post = function* () { //TODO querystring with label=fedex creates label, maybe track=true/false eventually
  let res = yield this.couch.put()
  .url(body => `/shipments/${body.account.from._id}.${body.account.to._id}.${this.couch.id()}`)
  .body(body => {
    //TODO replace this with an Easy Post API call that actually creates a label
    //TODO create pickup for the next business date
    body.tracking  = Math.floor(Math.random() * (99999-10000))+10000,
    body.createdAt = new Date().toJSON()
    this.body = body
  })
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
