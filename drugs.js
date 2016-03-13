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

var path = '/transactions/_design/auth/_view/drugs?include_docs=true&key=":id"'
exports.bulk_docs = function* () {
  var body = yield couch.json(this.req)

  for (var i in body.docs) {
    if ( ~ body.docs[i]._id.indexOf('_local/'))
      continue
    var transactions = yield couch(this, 'GET')
    .path(path.replace(':id', body.docs[i]._id))
    .proxy(false)

    for (var j in transactions.rows) {
      var transaction = transactions.rows[j].doc
      transaction.drug.generics = body.docs[i].generics
      transaction.drug.form     = body.docs[i].form

      if ( ! transaction.drug.retail)
        transaction.drug.retail = body.docs[i].retail

      if ( ! transaction.drug.wholesale)
        transaction.drug.wholesale = body.docs[i].wholesale

      var test = yield couch(this, 'PUT').path('/transactions/'+transaction._id).body(transaction).proxy(false)
      console.log('trans', body.docs[i], test)
    }
  }

  yield couch(this, 'POST').body(body)
  //TODO automatically add nadac and goodrx price?
}
