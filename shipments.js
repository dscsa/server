var couch = require('./couch')

exports.list  = couch.list
exports.doc   = couch.doc
exports.post = function* () { //TODO label=fedex creates label, maybe track=true/false eventually
  this.req.body = yield couch.json(this.req)
  yield couch(this, 'PUT')
  .path('/'+this.req.body.from.account+'.'+this.req.body.to.account+'.'+couch.id(), true)
  .body({
    //TODO replace this with an Easy Post API call that actually creates a label
    //TODO create pickup for the next business date
    tracking:Math.floor(Math.random() * (99999-10000))+10000,
    created_at:new Date().toJSON()
  }, false)
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
