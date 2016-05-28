"use strict"
let crypto = require('crypto')
let secret = require('../development')
let authorization = 'Basic '+new Buffer(secret.username+':'+secret.password).toString('base64')
let transaction   = require('./transaction')




exports.validate_doc_update = function(newDoc, oldDoc, userCtx) {

  // if ( ! userCtx.roles[0])
  //   throw({unauthorized:'You must be logged in to create or modify a drug'})

  if (newDoc._id.slice(0, 7) == '_local/') return
  if (newDoc._deleted) return

  ensure.prefix = 'drug'

  //Required
  ensure('_id').notNull.regex(/^\d{4}-\d{4}|\d{5}-\d{3}|\d{5}-\d{4}$/)
  ensure('createdAt').notNull.isDate.notChanged
  ensure('generics').notNull.isArray.length(1, 10)
  ensure('generics.name').notNull.isString.length(1, 50)
  ensure('generics.strength').notNull.isString.length(1, 10)
  ensure('form').notNull.isString.length(1, 20)
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
    if(doc._id.slice(0, 7) == '_design') return
    return true //Everyone can see all drugs except design documents
  }
}

exports.show = {
  authorized(doc, req) {
    if ( ! doc) return {code:404}
    return toJSON(req.query.open_revs ? [{ok:doc}]: doc) //Everyone can get/put/del all drugs
  }
}

exports.view = {
  authorized(doc) {
    emit(doc._id, {rev:doc._rev})
  }
}

exports.changes = function* () {
  yield this.http(exports.filter.authorized(this.url), true)
}

//Retrieve drug and update its price if it is out of date
exports.get = function*() {
  yield search.call(this, JSON.parse(this.query.selector))

  //show function cannot handle _deleted docs with open_revs, so handle manually here
  if (this.status == 404 && this.query.open_revs)
    yield this.http.get(this.path+'/'+selector._id, true)

}

exports.bulk_get = function* (id) {
  this.status = 400
}

//Drug product NDC is a good natural key
exports.post = function* () {
  let drug = yield this.http.body

  defaults(drug)

  let res = yield this.http.put('drug/'+drug._id).body(drug)

  this.status = res.status

  if (this.status != 201)
    return this.body = res.body

  //Make sure user gets the updated drug price
  yield search.call(this, {_id:drug._id})
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

  if (body.new_edits) return //Pouch uses this for local docs

  yield body.docs.map(drug => {
      return updateTransactions.call(this, drug)
  })
}

exports.delete = function* (id) {
  yield this.http(null, true)
}

function defaults(body) {
  body.createdAt  = body.createdAt || new Date().toJSON()

  let labelerCode = ('00000'+body._id.split('-')[0]).slice(-5)
  let productCode = ('0000'+body._id.split('-')[1]).slice(-4)

  body.ndc9  = labelerCode+productCode
  body.upc   = body._id.replace('-', '')
  body.price = body.price || {}
  body.price.nadac = +(+body.price.nadac).toFixed(4)
  body.price.goodrx = +(+body.price.goodrx).toFixed(4)
}

function *getNadac() {
  var d = new Date()
  d.setDate(d.getDate() - d.getDay() - 4) //Last Wednesday (getDay: Monday = 1 Sunday = 7)
  d = d.toJSON().slice(0,10)+'T00:00:00.000'
  let price = yield this.http.get(`http://data.medicaid.gov/resource/tau9-gfwr.json?$where=starts_with(ndc,"${this.body.ndc9}")&as_of_date=${d}`).headers({})

  if (price.body[0]) //API returns a status of 200 even on failure ;-(
    return +price.body[0].nadac_per_unit

  console.log("Drug's nadac price could not be updated", price)
}

function *getGoodrx() {
  let qs    = `name=${this.body.generics[0].name}&dosage=${this.body.generics[0].strength}&api_key=f46cd9446f`.replace(/ /g, '%20')
  let sig   = crypto.createHmac('sha256', 'c9lFASsZU6MEu1ilwq+/Kg==').update(qs).digest('base64').replace(/\/|\+/g, '_')
  let price = yield this.http.get(`https://api.goodrx.com/fair-price?${qs}&sig=${sig}`).headers({})
console.log('goodrx', price.body.data.price, price.body.data.quantity)
  if (price.status == 200) //409 error means qs not properly encoded, 400 means missing drug
    return price.body.data.quantity ? price.body.data.price/price.body.data.quantity : null

  console.log("Drug's goodrx price could not be updated", price.body.errors)
}

//Get all transactins using this drug so we can update denormalized database
function *updateTransactions(drug) {

  //TODO don't do this if drug.form and drug.generics were not changed
  let res = yield this.http.get(transaction.view.drugs(drug._id))

  if (res.status != 200) return

  for (let transaction of res.body) {
    transaction.drug.generics = drug.generics
    transaction.drug.form     = drug.form

    if ( ! transaction.drug.price)
      transaction.drug.price = drug.price

    //TODO _bulk_docs update would be faster (or at least catch errors with Promise.all)
    this.http.put('transaction/'+transaction._id).headers({authorization}).body(transaction)
    .then(res => console.log(res))
    .catch(e => console.log(e))
  }
}

function *search(selector, fields, sort) {

  if ( ! selector._id) return //TODO implement other searches

  let drug = yield this.http.get(exports.show.authorized(selector._id))

  this.status = drug.status
  this.body = drug.body
  if (drug.status != 200) return

  return yield updatePrice.call(this)
}

function *updatePrice() {

  if ( ! this.body.price || new Date() - new Date(this.body.price.updatedAt) < 7*24*60*60*1000)
    return this.body //! drug.price handles the open_revs [{ok:drug}] scenario.

  console.log('Updating drug price!', this.body)
  //TODO destructuring
  let prices = yield [getNadac.call(this), getGoodrx.call(this)]

  this.body.price.nadac  = prices[0] || this.body.price.nadac
  this.body.price.goodrx = prices[1] || this.body.price.goodrx
  this.body.price.updatedAt = new Date().toJSON()

  this.http.put('drug/'+this.body._id).body(this.body)
  .then(res => { //need a "then" trigger to send request but we don't need to yield to it
    console.log(res.status == 201 ? 'drug price was updated' : 'drug price could not be updated', res.body)
  })
}
