"use strict"
let co      = require('../co')
let crypto  = require('crypto')
let secret  = require('../../keys/dev')
let authorization = 'Basic '+new Buffer(secret.username+':'+secret.password).toString('base64')
let couchdb = require('./couchdb')

exports.shared = {
  ensure:couchdb.ensure,
  generic:generic
}

exports.validate_doc_update = function(newDoc, oldDoc, userCtx) {

  // if ( ! userCtx.roles[0])
  //   throw({unauthorized:'You must be logged in to create or modify a drug'})
  var ensure  = require('ensure')('drug', newDoc, oldDoc)
  var generic = require('generic')

  //Required
  ensure('_id').notNull.regex(/^\d{4}-\d{4}|\d{5}-\d{3}|\d{5}-\d{4}$/)
  ensure('createdAt').notNull.isDate.notChanged
  ensure('price.updatedAt').isDate
  ensure('generic').notNull.assert(matchesGeneric)
  ensure('generics').notNull.isArray.length(1, 10)
  ensure('generics.name').notNull.isString.regex(/([A-Z][0-9a-z]*\s?)+\b/)
  ensure('generics.strength').isString.regex(/^[0-9][0-9a-z/.]+$/)
  ensure('form').notNull.isString.regex(/([A-Z][a-z]+\s?)+\b/)
  ensure('upc').assert(upc)
  ensure('ndc9').assert(ndc9)

  //Optional
  ensure('brand').isString.length(0, 20)
  ensure('labeler').isString.length(0, 40)
  ensure('price.goodrx').isNumber
  ensure('price.nadac').isNumber

  function matchesGeneric(val) {
    return val == generic(newDoc) || 'drug.generic does not match drug.generics and drug.form'
  }

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
  this.req.setTimeout(20000)
  yield this.http(exports.filter.authorized(this.path), true)
}

//Retrieve drug and update its price if it is out of date
exports.get = function*() {
    let selector = JSON.parse(this.query.selector)

    if ( ! selector._id) return //TODO other search types

    this.body = yield this.http.get(exports.show.authorized(selector._id))

    //show function cannot handle _deleted docs with open_revs, so handle manually here
    //don't do pricing update even if there is an open_revs since its pouchdb not a user
    if (this.query.open_revs && this.status == 204)
      return yield this.http.get(this.path+'/'+selector._id, true)

    if (this.query.open_revs)
      return this.body[0].ok.generic = exports.generic(this.body[0].ok) //Not all docs have a generic name yet

    this.body.generic = exports.generic(this.body)

    yield exports.updatePrice.call(this, this.body)

    //need a "then" trigger to send request but we don't need to yield to it
    this.http.put('drug/'+selector._id).body(this.body).catch(res => {
      console.log('drug price could not be updated', drug, res)
    })
}

//Exporting non-standard method, but is used by transaction.js
exports.updatePrice = function* (drug) {
  drug.generic = drug.generic || exports.generic(drug)

  if ( ! drug.price || new Date() - new Date(drug.price.updatedAt) < 7*24*60*60*1000)
    return //! drug.price handles the open_revs [{ok:drug}] scenario.

  //TODO destructuring
  let prices = yield [getNadac.call(this, drug), getGoodrx.call(this, drug)]

  console.log('Updated prices for', drug._id, 'are nadac', prices[0], 'and goodrx', prices[1])
  drug.price.nadac  = prices[0] || drug.price.nadac
  drug.price.goodrx = prices[1] || drug.price.goodrx
  drug.price.updatedAt = new Date().toJSON()

  try {
    var res = yield this.http.put('drug/'+drug._id).body(drug)
  }
  catch (err) {
    console.log('Error updating drug price!', err, 'drug/'+drug._id, this.status, this.message, res, drug)
    return false
  }

  return true //let others now that the drug was updated
}

exports.bulk_get = function* (id) {
  this.status = 400
}

//Drug product NDC is a good natural key
exports.post = function* () {
  let drug = yield this.http.body

  if (typeof drug != 'object' || Array.isArray(drug))
    this.throw(422, 'drug must be an object')

  defaults(drug)

  let save = yield exports.updatePrice.call(this, drug)

  if ( ! save)
    yield this.http.put('drug/'+drug._id).body(drug)

  //Return the drug with updated pricing and the new _rev
  this.body   = yield this.http.get('drug/'+drug._id)
  this.status = 201
}

exports.put = function* () {
  this.body = yield this.http.body
  defaults(this.body)
  let save = yield this.http('drug/'+this.body._id).body(this.body)
  this.body._rev = save.rev
  yield updateTransactions.call(this, this.body)
}

exports.bulk_docs = function* () {

  let body = yield this.http.body
  //match timeout in dscsa-pouch
  this.req.setTimeout(body.docs.length * 1000)

  if (body.new_edits) //Pouch uses new_edits == true for local docs.
    return yield this.http(null, true).body(body)

  for (let drug of body.docs) defaults(drug)

  this.body = yield this.http().body(body)

  let chain = Promise.resolve()

  for (let i in body.docs) {
    let drug  = body.docs[i]
    let _rev  = drug._rev

    if (this.body[i] && this.body[i].rev) //if new_edits == true for replication this.body will be an empty array. http://wiki.apache.org/couchdb/HTTP_Bulk_Document_API#Posting_Existing_Revisions
      drug._rev = this.body[i].rev
    else
      console.log('no _rev', i, body.docs[i], this.body[i])

    //Don't wait for these updates since they could take a while.  Existing drugs needs their denormalized data updated. New drugs need current prices set.
    //If done in parrallel for a large number of transactions updates CouchDB will crash with ENFILE. https://issues.apache.org/jira/browse/COUCHDB-180.
    //Instead we create a promise chain the executes serially.  May be able to be improved with _bulk_docs
    chain = chain.then(_ => {
       co(_rev ? updateTransactions.call(this, drug) : exports.updatePrice.call(this, drug))
    })

    yield cb => {
      console.log('bulk upload', i, 'of', this.body.length)
      setTimeout(cb, 100) }
  }
}

exports.delete = function* (id) {
  yield this.http(null, true)
}

exports.generic = generic
function generic(drug) {
  function concat(generic) {
    return generic.name+" "+generic.strength
  }
  if ( ! drug.generics) console.log('no drug.generics', drug)
  return (drug.generics.map(concat).join(', ')+' '+drug.form).replace(/ Capsule| Tablet/, '').replace(/ ( |,)/g, "$1")
}

function defaults(body) {
  body.createdAt  = body.createdAt || new Date().toJSON()
  body.generics   = body.generics.sort((a, b) => a.name.localeCompare(b.name))
  body.generic    = exports.generic(body)

  let labelerCode = ('00000'+body._id.split('-')[0]).slice(-5)
  let productCode = ('0000'+body._id.split('-')[1]).slice(-4)

  body.ndc9  = labelerCode+productCode
  body.upc   = body._id.replace('-', '')
  body.price = body.price || {}
  body.price.nadac = body.price.nadac ? +(+body.price.nadac).toFixed(4) : null
  body.price.goodrx = body.price.goodrx ? +(+body.price.goodrx).toFixed(4) : null
}

function *getNadac(drug) {
  //Datbase not always up to date so can't always do last week.  On 2016-06-18 last as_of_date was 2016-05-11.
  let date = new Date(new Date().getFullYear(), 0, 1).toJSON().slice(0, -1)
  let url  = `http://data.medicaid.gov/resource/tau9-gfwr.json?$where=as_of_date>"${date}"`
  let prices = ""

  try {
    prices = yield this.http.get(`${url} AND starts_with(ndc,"${drug.ndc9}")`).headers({})
    if ( ! prices.length) //API returns a status of 200 even on failure ;-(
      throw 'No NADAC price found for an ndc starting with '+drug.ndc9
  } catch (err) {

      for (generic of drug.generics) {
        let strength = generic.strength.replace(/[^0-9.]/g, '%')
        let name = drug.generics.length > 1 ? '%' : ''
        name += generic.name.toUpperCase().slice(0,4)
        url += ` AND ndc_description like "${name}%${strength}%"`.replace(/%+/g, '%25') //In order to make sure Chrome recognizes as % symbol, necessary to represent wildcard in api
      }

      try{
        prices = yield this.http.get(url).headers({})

        if( ! prices.length)  //When the price is not found but no error is thrown
          throw err+' or by name '+url

      } catch (err) {
        return console.log(err, this.status, this.message, prices, drug._id, drug.generic)
      }
  }

  let response = prices.pop()

  //Need to handle case where price is given per ml to ensure database integrity
  if(response.pricing_unit == "ML"){ //a component of the NADAC response that described unit of price ("each" or "ml")
    let numberOfML = response.ndc_description.match(/\/([0-9.]+)[^\/]*$/) //looks for the denominator in strength to determine per unit cost, not per ml
    if(numberOfML){  //responds null if there is no denominator value in strength
      let total = +numberOfML[1] * +response.nadac_per_unit //essentialy number of ml times price per ml
      console.log("Converted from price/ml to price/unit of: ", total)
      return +total.toFixed(4)
    }
  }

  return +(+response.nadac_per_unit).toFixed(4) //In other case where price is found, will return here
}

exports.goodrx = getGoodrx
function *getGoodrx(drug) {

  let makeUrl = (name, dosage) => {
    let qs  =`name=${name}&dosage=${dosage}&api_key=f46cd9446f`.replace(/ /g, '%20')
    let sig = crypto.createHmac('sha256', 'c9lFASsZU6MEu1ilwq+/Kg==').update(qs).digest('base64').replace(/\/|\+/g, '_')
    return `https://api.goodrx.com/fair-price?${qs}&sig=${sig}`
  }

  //Brand better for compound name. Otherwise use first word since, suffixes like hydrochloride sometimes don't match
  let fullName = drug.brand || drug.generics.map(generic => generic.name).join('-') //.split(' ')[0]
  let strength = drug.generics.map(generic => generic.strength.replace(' ', '')).join('-')
  let price = {data:{}}
  let candidateUrl, fullNameUrl = makeUrl(fullName, strength)
  let message = ''
  try {
    price = yield this.http.get(fullNameUrl).headers({})
  } catch(err) {
    try {
      if( ! err.errors || ! err.errors[0].candidates) //then there's no fair price drug so this is undefined
        return console.log("GoodRx responded that there is no fair price drug")

      candidateUrl = makeUrl(err.errors[0].candidates[0], strength)
      price = yield this.http.get(candidateUrl).headers({})
      console.log("GoodRx substituting a candidate", err.errors[0].candidates[0], 'for', drug._id, drug.generic)
    } catch(err2) {
      //409 error means qs not properly encoded, 400 means missing drug
      return console.log("GoodRx price could not be updated", this.status, this.message, price, drug._id, drug.generics, fullNameUrl, candidateUrl)
    }
  }

  if ( ! price.data.quantity)
    return console.log('GoodRx did not return a quantity', price) || null

  return +(price.data.price/price.data.quantity).toFixed(4)
}

//Get all transactins using this drug so we can update denormalized database
let transaction = require('./transaction') //this creates a circular reference with drugs so cannot be included at top with other requires
function *updateTransactions(drug) {
  //TODO don't do this if drug.form and drug.generics were not changed
  let transactions = yield this.http.get(transaction.view.drugs(drug._id))

  for (let transaction of transactions) {
    if(
      (JSON.stringify(transaction.drug.generics) == JSON.stringify(drug.generics))
      && (transaction.drug.form == drug.form)
      && (transaction.drug.brand == drug.brand)
    ) continue

    transaction.drug.generics = drug.generics
    transaction.drug.form     = drug.form
    transaction.drug.brand    = drug.brand
    transaction.drug.generic  = drug.generic

    if ( ! transaction.drug.price)
      transaction.drug.price = drug.price

    //TODO _bulk_docs update would be faster (or at least catch errors with Promise.all)
    this.http.put('transaction/'+transaction._id).headers({authorization}).body(transaction)
    .catch(err => console.log(err))
  }
}
