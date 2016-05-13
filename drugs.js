"use strict"
let crypto = require('crypto')

function defaults(body) {
  body.createdAt  = body.createdAt || new Date().toJSON()
exports.validate_doc_update = function(newDoc, oldDoc, userCtx) {

  // if ( ! userCtx.roles[0])
  //   throw({unauthorized:'You must be logged in to create or modify a drug'})

  if (newDoc._id.slice(0, 7) == '_local/')
    return

  if ( ! isArray(newDoc.generics))
    throw({forbidden:'drug.generics must be an array. Got '+toJSON(newDoc)})

  if ( ! newDoc.form)
    throw({forbidden:'drug.form is required. Got '+toJSON(newDoc)})

  if ( ! newDoc.ndc9)
    throw({forbidden:'drug.ndc9 is required. Got '+toJSON(newDoc)})

  if ( ! newDoc.upc)
    throw({forbidden:'drug.upc is required. Got '+toJSON(newDoc)})

  if ( ! ~ newDoc._id.indexOf('-'))
    throw({forbidden:'drug._id must be a product NDC with a dash. Got '+toJSON(newDoc)})

  if (newDoc._id.replace('-', '') != newDoc.upc)
    throw({forbidden:"drug.ndc9 must be CMS's 9 digit version of drug._id. Got "+toJSON(newDoc)})

  if (newDoc._id.length < 8 || newDoc._id.length > 9)
    throw({forbidden:'drug._id must be a product NDC between 8 and 9 characters long. Got '+toJSON(newDoc)})

  var labeler = ('00000'+newDoc._id.split('-')[0]).slice(-5)
  var product = ('0000'+newDoc._id.split('-')[1]).slice(-4)
  if (newDoc.ndc9.length != 9 || (labeler + product) != newDoc.ndc9)
    throw({forbidden:"drug.ndc9 must be CMS's 9 digit version of drug._id. Got "+toJSON(newDoc)})
}

function nadacUrl() {
  var d = new Date()
  d.setDate(d.getDate() - d.getDay() - 4) //Last Wednesday (getDay: Monday = 1 Sunday = 7)
  d = d.toJSON().slice(0,10)+'T00:00:00.000'
  return `http://data.medicaid.gov/resource/tau9-gfwr.json?$where=starts_with(ndc,"${body.ndc9}")&as_of_date=${d}`
}

function goodrxUrl() {
  let qs     = `name=${body.generics[0].name}&dosage=${body.generics[0].strength}&api_key=f46cd9446f`
  let sig    = crypto.createHmac('sha256', 'c9lFASsZU6MEu1ilwq+/Kg==').update(qs).digest('base64').replace(/\/|\+/g, '_')
  return `https://api.goodrx.com/fair-price?${qs}&sig=${sig}`
}

//Retrieve drug and update its price if it is out of date
exports.get = function*(id) {

    let drug = yield this.http.get('drugs/'+id)

    this.status  = drug.status
    this.body    = drug.body
    this.set(drug.headers)

    if (new Date() - new Date(drug.body.price.updatedAt) < 7*24*60*60*1000)
      return

    let prices = yield Promise.all([
      this.http.get(nadacUrl()).headers({}),
      this.http.get(goodrxUrl()).headers({})
    ])

    let nadac  = prices[0].body[0]
    let goodrx = prices[1].body.data

    if (nadac || goodrx)
      drug.body.price.updatedAt = new Date().toJSON()

    if (nadac)
      drug.body.price.nadac  = +nadac.nadac_per_unit

    if (goodrx)
      drug.body.price.goodrx = goodrx.price/goodrx.quantity

    this.http.put('drugs/'+drug.body.drug._id).body(drug.body)
    .then(res => { //need a "then" trigger to send request but we don't need to yield to it
      return res.status != 201 && console.log('drug price could not be updated', res.body)
    })
}

//Drug product NDC is a good natural key
exports.post = function* () {
  let drug = yield this.http.body

  defaults(drug.body)

  let res = yield this.http.put('drugs/'+drug.body.ndc).body(drug.body)

  this.status = res.status

  if (this.status != 201)
    return this.body = res.body

  //Make sure user gets the updated drug price
  yield this.http.get('drugs/'+body.ndc, true)
}

exports.delete = function* () {
  yield this.http(null, true)
}

//Get all transactins using this drug so we can update denormalized database
function* updateTransactions(drug) {

  //TODO don't do this if drug.form and drug.generics were not changed
  let transactions = yield this.http.get(`transactions/_design/auth/_view/drugs?include_docs=true&key="${drug._id}"`)

  for (let transaction of transactions) {
    transaction.doc.drug.generics = drug.generics
    transaction.doc.drug.form     = drug.form

    if ( ! transaction.doc.drug.price)
      transaction.doc.drug.price = drug.price

    //TODO _bulk_docs update would be faster (or at least catch errors with Promise.all)
    this.http.put('transactions/'+transaction._id).body(transaction.doc)
  }
}

exports.put = function* () {

  let drug = yield this.http.body

  defaults(drug.body)

  updateTransactions.call(this, drug.body)

  let update = yield this.http(null, true).body(drug.body)

  this.status = update.status

  if (this.status != 201)
    return this.body = update.body

  this.body      = drug
  this.body._rev = update.body.rev
}

exports.bulk_docs = function* () {

  let body = yield this.http.body

  for (let drug of body.docs) {
    if ( ! drug._id.includes('_local/')) {
      defaults(drug)
      updateTransactions.call(this, drug)
    }
  }

  yield this.couch(null, true).body(body)
}
