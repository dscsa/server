"use strict"
let crypto       = require('crypto')
let transactions = require('./transactions')

exports.validate_doc_update = function(newDoc, oldDoc, userCtx) {

  // if ( ! userCtx.roles[0])
  //   throw({unauthorized:'You must be logged in to create or modify a drug'})

  if (newDoc._id.slice(0, 7) == '_local/') return

  ensure.prefix = 'drug'

  //Required
  ensure('_id').notNull.regex(/^\d{4}-\d{4}|\d{5}-\d{3}|\d{5}-\d{4}$/)
  ensure('createdAt').notNull.isDate.notChanged
  ensure('generics').notNull.isArray.length(1, 10)
  ensure('generics.name').notNull.isString
  ensure('generics.strength').notNull.isString
  ensure('form').notNull.isString
  ensure('upc').assert(upc)
  ensure('ndc9').assert(ndc9)

  //Optional
  ensure('brand').isString
  ensure('labeler').isString
  ensure('price.updatedAt').isDate
  ensure('price.goodrx').isNumber
  ensure('price.nadac').isNumber

  function upc(val) {
    return val == newDoc._id.replace('-', '') || 'must be same as _id without the "-" and no 0s for padding'
  }

  function ndc9(val) {
    return val == ('00000'+newDoc._id.split('-')[0]).slice(-5)+('0000'+newDoc._id.split('-')[1]).slice(-4) || 'must be same as _id with 5 digit labeler code and 4 digit product code, no "-"'
  }
}

//Note ./startup.js saves views,filters,and shows as toString into couchdb and then replaces
//them with a function that takes a key and returns the couchdb url needed to call them.
exports.filter = {
  authorized(doc, req) {
    return doc._id.slice(0, 7) != '_design' //Everyone can see all drugs except design documents
  }
}

exports.view = {
  authorized(doc) {
    emit(doc._id, {rev:doc._rev})
  }
}

exports.show = {
  authorized(doc, req) {
    if ( ! doc) return
    return toJSON([{ok:doc}]) //Everyone can get/put/del all drugs
  }
}

exports.changes = function* (db) {
  yield this.http(exports.filter.authorized(this.url), true)
}

exports.list = function* () {
  yield this.http(exports.view.authorized(), true)
}

//Retrieve drug and update its price if it is out of date
exports.get = function*(id) {
    let drug = yield this.http.get(exports.show.authorized(id))

    this.status  = drug.status
    this.body    = drug.body
    this.set(drug.headers)

    if (this.status != 200) return

    drug = drug.body[0].ok
    if (new Date() - new Date(drug.price.updatedAt) < 7*24*60*60*1000)
      return console.log('Prices up to date.')

    //TODO destructuring
    let prices = yield [getNadac.call(this, drug), getGoodrx.call(this, drug)]

    drug.price.nadac  = prices[0] || drug.price.nadac
    drug.price.goodrx = prices[1] || drug.price.goodrx

    drug.price.updatedAt = new Date().toJSON()

    this.http.put('drugs/'+drug._id).body(drug)
    .then(res => { //need a "then" trigger to send request but we don't need to yield to it
      if (res.status != 201)
        console.log('drug price could not be updated', res.body)
    })
}

exports.bulk_get = function* (id) {
  this.status = 400
}

//Drug product NDC is a good natural key
exports.post = function* () {
  let drug = yield this.http.body

  defaults(drug)

  let res = yield this.http.put('drugs/'+drug._id).body(drug)

  this.status = res.status

  if (this.status != 201)
    return this.body = res.body

  //Make sure user gets the updated drug price
  yield this.http.get('drugs/'+drug._id, true)
}

exports.put = function* () {

  let drug = yield this.http.body

  let res  = yield this.http(null, true).body(drug.body)

  yield updateTransactions.call(this, drug.body)

  this.status = res.status

  if (this.status != 201)
    return this.body = res.body

  this.body      = drug.body
  this.body._rev = res.body.rev
}

exports.bulk_docs = function* () {

  let body  = yield this.http.body
  let res   = yield this.http(null).body(body)
  this.status = res.status
  this.body   = res.body

  let all   = []
  for (let i in body.docs) {
    let drug = body.docs[i]
    if (res.body[i].error) {
      this.status = 403
      continue
    }

    if ( ! drug._id.includes('_local/')) {
      all.push(updateTransactions.call(this, drug))
    }
  }

  yield all
}

exports.delete = function* (id) {

  yield this.http.get('drugs/'+id, true)

  if (this.status == 200)
    yield this.http.delete(`/drugs/${id}?rev=${drug.body._rev}`, true)
}

function defaults(body) {
  body.createdAt  = body.createdAt || new Date().toJSON()

  let labelerCode = ('00000'+body._id.split('-')[0]).slice(-5)
  let productCode = ('0000'+body._id.split('-')[1]).slice(-4)

  body.ndc9 = labelerCode+productCode
  body.upc  = body._id.replace('-', '')

  body.price = body.price || {}
}

function *getNadac(drug) {
  var d = new Date()
  d.setDate(d.getDate() - d.getDay() - 4) //Last Wednesday (getDay: Monday = 1 Sunday = 7)
  d = d.toJSON().slice(0,10)+'T00:00:00.000'
  let price = yield this.http.get(`http://data.medicaid.gov/resource/tau9-gfwr.json?$where=starts_with(ndc,"${drug.ndc9}")&as_of_date=${d}`).headers({})

  if (price.body[0]) //API returns a status of 200 even on failure ;-(
    return price.body[0].nadac_per_unit

  console.log("Drug's nadac price could not be updated", price)
}

function *getGoodrx(drug) {
  let qs    = `name=${drug.generics[0].name}&dosage=${drug.generics[0].strength}&api_key=f46cd9446f`.replace(/ /g, '%20')
  let sig   = crypto.createHmac('sha256', 'c9lFASsZU6MEu1ilwq+/Kg==').update(qs).digest('base64').replace(/\/|\+/g, '_')
  let price = yield this.http.get(`https://api.goodrx.com/fair-price?${qs}&sig=${sig}`).headers({})

  if (price.status == 200) //409 error means qs not properly encoded, 400 means missing drug
    return price.body.data.quantity ? price.body.data.price/price.body.data.quantity : null

  console.log("Drug's goodrx price could not be updated", price.body.errors)
}

//Get all transactins using this drug so we can update denormalized database
function *updateTransactions(drug) {
  //TODO don't do this if drug.form and drug.generics were not changed
  let res = yield this.http.get(transactions.view.drugs(drug._id))

  if (res.status != 200) return

  for (let transaction of res.body) {
    transaction.doc.drug.generics = drug.generics
    transaction.doc.drug.form     = drug.form

    if ( ! transaction.doc.drug.price)
      transaction.doc.drug.price = drug.price

    //TODO _bulk_docs update would be faster (or at least catch errors with Promise.all)
    this.http.put('transactions/'+transaction._id).body(transaction.doc)
  }
}
