var couch = require('./couch')

exports.list = couch.list
exports.doc  = couch.doc
//Drug NDC is a good natural key
exports.post = function* () {
  this.req.body     = yield couch.json(this.req)
  this.req.body._id = this.req.body.ndc
  yield couch.post.call(this)
}
