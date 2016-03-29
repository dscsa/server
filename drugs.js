"use strict"
//Drug product NDC is a good natural key
exports.post = function* () {
  yield this.couch
  .put({proxy:true})
  .url(body => 'drugs/'+body.ndc)
  .body(body => {
    delete body._rev
    body.createdAt  = new Date().toJSON()

    let labelerCode = ('00000'+body._id.split('-').slice(0,1)).slice(-5)
    let productCode = ('0000'+body._id.split('-').slice(1)).slice(-4)

    body.ndc9 = labelerCode+productCode
    body.upc  = body._id.replace('-', '')
    return body
  })
}

exports.doc = function* () {
  if (this.method != 'PUT')
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
      //TODO this is serial should be done in parallel with Promise.all
      all.push(exports.doc.call(this))
    }
    return Promise.all(all).then(_ => body)
  })
}
