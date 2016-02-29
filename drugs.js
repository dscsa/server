var couch = require('./couch')

exports.list = couch.list
exports.doc  = couch.doc
//Drug NDC is a good natural key
exports.post = function* () {
  var body = yield couch.json(this.req)

  //Force this to conform
  //body.generic = body.generics.map(generic => generic.name+" "+generic.strength).join(', ')

  yield couch(this, 'PUT')
  .path('/'+body.ndc, true)
  .body(body)
  //TODO automatically add nadac and goodrx price?
}
