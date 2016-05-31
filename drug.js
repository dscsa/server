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
  ensure('price.updatedAt').notNull.isDate
  ensure('generics').notNull.isArray.length(1, 10)
  ensure('generics.name').notNull.isString.length(1, 50)
  ensure('generics.strength').notNull.isString.length(1, 10)
  ensure('form').notNull.isString.length(1, 20)
  ensure('upc').assert(upc)
  ensure('ndc9').assert(ndc9)

  //Optional
  ensure('brand').isString
  ensure('labeler').isString
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
    if ( ! doc) return {code:204}
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
    let selector = JSON.parse(this.query.selector)

    if ( ! selector._id) return //TODO other search types

    this.body = yield this.http(exports.show.authorized(selector._id))

    //show function cannot handle _deleted docs with open_revs, so handle manually here
    if (this.status == 204 && this.query.open_revs)
      return yield this.http.get(this.path+'/'+selector._id, true)

    yield exports.updatePrice.call(this, this.body)

    this.http.put('drug/'+drug._id).body(this.body)
    .catch(res => { //need a "then" trigger to send request but we don't need to yield to it
      console.log('drug price could not be updated', drug, res)
    })
}

//Exporting non-standard method, but is used by transaction.js
exports.updatePrice = function* (drug) {

  if ( ! drug.price || new Date() - new Date(drug.price.updatedAt) < 7*24*60*60*1000)
    return //! drug.price handles the open_revs [{ok:drug}] scenario.

  //TODO destructuring
  let prices = yield [getNadac.call(this, drug), getGoodrx.call(this, drug)]

  drug.price.nadac  = prices[0] || drug.price.nadac
  drug.price.goodrx = prices[1] || drug.price.goodrx
  drug.price.updatedAt = new Date().toJSON()
}

exports.bulk_get = function* (id) {
  this.status = 400
}

//Drug product NDC is a good natural key
exports.post = function* () {
  let drug = yield this.http.body

  defaults(drug)

  yield exports.updatePrice.call(this, drug)

  let save = yield this.http.put('drug/'+drug._id).body(drug)

  drug._rev   = save.rev
  this.body   = drug
}

exports.put = function* () {
  let drug = yield this.http.body
  let save = yield this.http.put().body(drug)

  yield updateTransactions.call(this, drug)
}

exports.bulk_docs = function* () {

  let body  = yield this.http.body
  yield this.http(null, true).body(body)

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

function *getNadac(drug) {
  var d = new Date()
  d.setDate(d.getDate() - d.getDay() - 4) //Last Wednesday (getDay: Monday = 1 Sunday = 7)
  d = d.toJSON().slice(0,10)+'T00:00:00.000'

  let price = yield this.http.get(`http://data.medicaid.gov/resource/tau9-gfwr.json?$where=starts_with(ndc,"${drug.ndc9}")&as_of_date=${d}`).headers({})

  if (price[0]) //API returns a status of 200 even on failure ;-(
    return +price[0].nadac_per_unit

  console.log("Drug's nadac price could not be updated", price)
}

function *getGoodrx(drug) {
  let qs    = `name=${drug.generics[0].name}&dosage=${drug.generics[0].strength}&api_key=f46cd9446f`.replace(/ /g, '%20')
  let sig   = crypto.createHmac('sha256', 'c9lFASsZU6MEu1ilwq+/Kg==').update(qs).digest('base64').replace(/\/|\+/g, '_')

  try {
    let price = yield this.http.get(`https://api.goodrx.com/fair-price?${qs}&sig=${sig}`).headers({})
    console.log('goodrx', price.data.price, price.data.quantity)
    return price.data.quantity ? price.data.price/price.data.quantity : null
  } catch(err) {
    console.log("Drug's goodrx price could not be updated", err) //409 error means qs not properly encoded, 400 means missing drug
  }
}

//Get all transactins using this drug so we can update denormalized database
function *updateTransactions(drug) {

  //TODO don't do this if drug.form and drug.generics were not changed
  let transactions = yield this.http.get(transaction.view.drugs(drug._id))

  for (let transaction of transactions) {
    transaction.drug.generics = drug.generics
    transaction.drug.form     = drug.form

    if ( ! transaction.drug.price)
      transaction.drug.price = drug.price

    //TODO _bulk_docs update would be faster (or at least catch errors with Promise.all)
    this.http.put('transaction/'+transaction._id).headers({authorization}).body(transaction)
    .then(res => console.log(res))
    .catch(err => console.log(err))
  }
}
