"use strict"
function defaults(body) {

  body.createdAt  = new Date().toJSON()

  let labelerCode = ('00000'+body._id.split('-')[0]).slice(-5)
  let productCode = ('0000'+body._id.split('-')[1]).slice(-4)

  body.ndc9 = labelerCode+productCode
  body.upc  = body._id.replace('-', '')
}
//Drug product NDC is a good natural key
exports.post = function* () {
  let res = yield this.couch.put()
  .url(body => 'drugs/'+body.ndc)
  .body(body => {
    defaults(body)
    this.body = body
  })
  this.status    = res.status

  if (this.status != 201)
    return this.body = res.body

  this.body._id  = res.body.id
  this.body._rev = res.body.rev
}

exports.doc = function* () {
  if (this.method == 'POST')
    return yield exports.post.call(this)

  if (this.method != 'PUT') //DELETE, GET
    return yield this.couch({proxy:true})

  yield this.couch({proxy:true}).body(body => {

    body.updatedAt  = new Date().toJSON()

    //Update denormalized transaction data
    return this.couch.get()
    .url(`/transactions/_design/auth/_view/drugs?include_docs=true&key="${body.doc._id}"`)
    .then(json => {
      let transactions = json.body.rows
      for (let j in transactions) {
        let transaction = transactions[j].doc
        transaction.drug.generics = body.doc.generics
        transaction.drug.form     = body.doc.form

        if ( ! transaction.drug.retail)
          transaction.drug.retail = body.doc.retail

        if ( ! transaction.drug.wholesale)
          transaction.drug.wholesale = body.doc.wholesale

        this.couch.put().url('/transactions/'+transaction._id).body(transaction)
      }
    })
    .then(_ => body)
  })
}

exports.bulk_docs = function* () {
  yield this.couch({proxy:true}).body(body => {
    let all = []

    for (let i in body.docs) {

      if ( ~ body.docs[i]._id.indexOf('_local/'))
        continue

      if (this.method == 'POST')
        defaults(body.docs[i])
      else
        all.push(exports.doc.call(this))
    }
    return Promise.all(all).then(_ => body)
  })
}
