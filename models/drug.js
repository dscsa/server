"use strict"
//defaults
module.exports = exports = Object.create(require('../helpers/model'))

let crypto = require('crypto')
let csv = require('csv/server')
let admin  = {ajax:{auth:require('../../../keys/dev.js')}}

//Drugs
exports.views = {
  'generics.name':function(doc) {
    for (var i in doc.generics) {
      if ( ! doc.generics[i].name)
        log('drug generic map error for', doc)

      emit(doc.generics[i].name.toLowerCase())
    }
  },

  ndc9(doc) {
    emit(doc.ndc9)
  },

  upc(doc) {
    emit(doc.upc)
  },

  //Along with the transaction.js counterpart drug.generic, Will be used to make sure all brand names are consistent for a given generic name
  'by-generic-brand':function(doc) {
    emit([doc.generic, doc.brand])
  },

  //Ensure that all labeler codes have the same manufacturer
  'by-labelcode-labeler':function(doc) {
    emit([doc._id.split('-')[0], doc.labeler])
  }

}

exports.get_csv = function*(db) {
  let view = yield this.db.drug.allDocs({endkey:'_design', include_docs:true})
  this.body = csv.fromJSON(view.rows)
  this.type = 'text/csv'
}

//Server-side validation methods to supplement shared ones.
exports.validate = function(model) {
  return model
    .ensure('_rev').custom(updateTransactionsWithBrand).withMessage('Could not update drug.brand on all transactions')
    .ensure('_rev').custom(updateTransactionsWithGeneric).withMessage('Could not update drug.generic on all transactions')
    .ensure('_rev').custom(updateDrugsWithBrand).withMessage('Could not update brand name on all drugs')
    .ensure('_rev').custom(updateDrugsWithLabeler).withMessage('Could not update labeler on all drugs')
    //.ensure('_rev').trigger(updatePrice).withMessage('Could not update the price of this drug')
}

function updatePrice(drug, rev, key, opts) {
  //This drug rev was saved to pouchdb on client.  We can't update this _rev with a price
  //without causing a discrepancy between the client and server.  Instead, we wait for a
  //bit and then save the price info to a new _rev which will replicate back to the client
  return exports.updatePrice.call(this, drug, 500)
}

//GET the full drug first since want this to work with both drug and transaction.drug
//the get is not wasteful since
//Look up the goodrx and nadac price of the drug
//Update the drug with the new price info
//Update all transactions with 0 price including any that were just entered
exports.updatePrice = function(drug, delay) {

  return getPrice.call(this, drug)
  .then(price => {
    console.log('drug.updatePrice', price)
    if (price)
      setTimeout(_ => {
        this.db.drug.get(drug._id)
        .then(drug => {
          drug.price = price
          return this.db.drug.put(drug, {this:this})
        })
        .catch(err => console.log('drug.updatePrice saving err', err))
      }, delay)

    return price
  })
  .catch(err => console.log('drug.updatePrice getting err', err))
}

function getPrice(drug) {

  if (new Date() < new Date(drug.price.invalidAt) )
    return Promise.resolve(false)

  let nadac     = getNadac.call(this, drug) //needs ndc9
  let goodrx    = getGoodrx.call(this, drug)
  let retail    = getRetail.call(this, drug)
  let invalidAt = new Date(Date.now()+7*24*60*60*1000).toJSON().slice(0, 10) //Auto-filled prices expire in one week

  return Promise.all([nadac, goodrx, retail]).then(all => {
    return {nadac:all[0], goodrx:all[1], retail:all[2], invalidAt}
  })
}

//Update denormalized database
//Context-specific - options MUST have 'this' property in order to work.
function updateDrugsWithLabeler(drug, rev, key, opts) {

  const delayed = () => {

    let labelcode = drug._id.split('-')[0]

    Promise.all([
      this.db.drug.query('by-labelcode-labeler', {startkey:[labelcode], endkey:[labelcode, drug.labeler], include_docs:true, inclusive_end:false}),
      this.db.drug.query('by-labelcode-labeler', {startkey:[labelcode, drug.labeler, {}], endkey:[labelcode, {}], include_docs:true}),
      this.db.drug.query('by-labelcode-labeler', {startkey:[labelcode], endkey:[labelcode, {}]})
    ]).then(([ltLabeler, gtLabeler, allLabeler]) => {

      let wrongLabeler = ltLabeler.rows.concat(gtLabeler.rows)
      console.log('Updating', wrongLabeler.length, 'of', allLabeler.rows.length, 'drugs with labeler name', drug.labeler)

      if ( ! wrongLabeler.length) return

      //TODO this will miss an update of Tablets <--> Capsules because that won't cause a change in the generic name.  I think this is okay at least for now
      wrongLabeler = wrongLabeler.map(row => {
        console.log(row.doc._id, row.doc.generic, row.doc.labeler, '-->', drug.labeler)
        row.doc.labeler  = drug.labeler
        return row.doc
      })

      return this.db.drug.bulkDocs(wrongLabeler, {this:this, ajax:admin.ajax})

    }).catch(err => {
      console.log('updateDrugsWithLabeler err', err) //err.errors['shipment._id'].rules
    })
  }

  if ( ! opts.ajax)//since this saves back to drug db it can cause an infinite loop  if not careful
    setTimeout(delayed, 1000)

  return true
}

//Update denormalized database
//Context-specific - options MUST have 'this' property in order to work.
function updateDrugsWithBrand(drug, rev, key, opts) {

  const delayed = () => {
    Promise.all([
      this.db.drug.query('by-generic-brand', {startkey:[drug.generic], endkey:[drug.generic, drug.brand], include_docs:true, inclusive_end:false}),
      this.db.drug.query('by-generic-brand', {startkey:[drug.generic, drug.brand, {}], endkey:[drug.generic, {}], include_docs:true}),
      this.db.drug.query('by-generic-brand', {startkey:[drug.generic], endkey:[drug.generic, {}]})
    ]).then(([ltBrand, gtBrand, allBrand]) => {

      let wrongBrand = ltBrand.rows.concat(gtBrand.rows)
      console.log('Updating', wrongBrand.length, 'of', allBrand.rows.length, 'drugs with brand name', drug.brand)

      if ( ! wrongBrand.length) return

      wrongBrand = wrongBrand.map(row => {
        console.log(row.doc.brand, '-->', drug.brand, row.doc._id, row.doc.generic)
        row.doc.brand = drug.brand
        return row.doc
      })

      //console.log('updateDrugsWithBrand', JSON.stringify(wrongBrand, null, ' '))
      return this.db.drug.bulkDocs(wrongBrand, {this:this, ajax:admin.ajax})

    }).catch(err => {
      console.log('updateDrugsWithBrand err', err) //err.errors['shipment._id'].rules
    })
  }

  if ( ! opts.ajax) //since this saves back to drug db it can cause an infinite loop  if not careful
    setTimeout(delayed, 1000)

  return true
}

//Update denormalized database
//Context-specific - options MUST have 'this' property in order to work.
function updateTransactionsWithBrand(drug, rev, key, opts) {


  const delayed = () => {
    Promise.all([
      this.db.transaction.query('by-generic-brand', {startkey:[drug.generic], endkey:[drug.generic, drug.brand], include_docs:true, inclusive_end:false}),
      this.db.transaction.query('by-generic-brand', {startkey:[drug.generic, drug.brand, {}], endkey:[drug.generic, {}], include_docs:true}),
      this.db.transaction.query('by-generic-brand', {startkey:[drug.generic], endkey:[drug.generic, {}]})
    ]).then(([ltBrand, gtBrand, allBrand]) => {

      let wrongBrand = ltBrand.rows.concat(gtBrand.rows)
      console.log('Updating', wrongBrand.length, 'of', allBrand.rows.length, 'transactions with brand name', drug.brand)

      if ( ! wrongBrand.length) return

      wrongBrand = wrongBrand.map(row => {
        console.log( row.doc.drug.brand, '-->', drug.brand, row.doc._id, row.doc.drug._id, row.doc.drug.generic)
        row.doc.drug.brand = drug.brand
        return row.doc
      })

      return this.db.transaction.bulkDocs(wrongBrand, {this:this, ajax:admin.ajax})

    }).catch(err => {
      console.log('updateTransactionsWithBrand err', err) //err.errors['shipment._id'].rules
    })
  }

  if ( ! opts.ajax)
    setTimeout(delayed, 1000)

  return true
}

//Update denormalized database
//Context-specific - options MUST have 'this' property in order to work.
function updateTransactionsWithGeneric(drug, rev, key, opts) {

  const delayed = () => {
    Promise.all([
      this.db.transaction.query('by-ndc-generic', {startkey:[drug._id], endkey:[drug._id, drug.generic], include_docs:true, inclusive_end:false}),
      this.db.transaction.query('by-ndc-generic', {startkey:[drug._id, drug.generic, {}], endkey:[drug._id, {}], include_docs:true}),
      this.db.transaction.query('by-ndc-generic', {startkey:[drug._id], endkey:[drug._id, {}]})
    ]).then(([ltGeneric, gtGeneric, allGeneric]) => {

      let wrongGeneric = ltGeneric.rows.concat(gtGeneric.rows)
      console.log('Updating', wrongGeneric.length, 'of', allGeneric.rows.length, 'transactions with generic name', drug.generic)

      if ( ! wrongGeneric.length) return

      //TODO this will miss an update of Tablets <--> Capsules because that won't cause a change in the generic name.  I think this is okay at least for now
      wrongGeneric = wrongGeneric.map(row => {
        console.log( row.doc.drug.generic,  '-->', drug.generic, row.doc._id, row.doc.drug._id)
        row.doc.drug.generic  = drug.generic
        row.doc.drug.generics = drug.generics
        row.doc.drug.form     = drug.form
        return row.doc
      })

      return this.db.transaction.bulkDocs(wrongGeneric, {this:this, ajax:admin.ajax})

    }).catch(err => {
      console.log('updateTransactionsWithGeneric err', err) //err.errors['shipment._id'].rules
    })
  }

  if ( ! opts.ajax)
    setTimeout(delayed, 1000)

  return true
}

function getNadac(drug) {
  let date = new Date(); date.setMonth(date.getMonth() - 2) //Datbase not always up to date so can't always do last week.  On 2016-06-18 last as_of_date was 2016-05-11, so lets look back two months
  let url = `http://data.medicaid.gov/resource/tau9-gfwr.json?$where=as_of_date>"${date.toJSON().slice(0, -1)}"`

  let ndcUrl = url+nadacNdcUrl(drug)
  return this.ajax({url:ndcUrl})
  .then(nadac => {

    if (nadac.body && nadac.body.length)
      return nadacCalculatePrice(nadac.body.pop(), drug)

    console.log('No NADAC price found for an ndc starting with '+drug.ndc9, ndcUrl)
    let nameUrl = url+nadacNameUrl(drug)
    return this.ajax({url:nameUrl})
    .then(nadac => {

      if(nadac.body && nadac.body.length)  //When the price is not found but no error is thrown
        return nadacCalculatePrice(nadac.body.pop(), drug)

      console.log('No NADAC price found for a name like', drug.generics, nameUrl)
    })
  })
  .catch(err => console.log('nadac err', err))
}

//drug may be transaction.drug which doesn't have drug.ndc9
function nadacNdcUrl(drug) {
  drug.ndc9 = drug.ndc9 || ndc9(drug)
  return `AND starts_with(ndc,"${drug.ndc9}")`
}

function ndc9(drug) {
  let [labeler, product] = drug._id.split('-')
  return ('00000'+labeler).slice(-5)+('0000'+product).slice(-4)
}

function nadacNameUrl(drug) {
  //Transform our names and strengths to match NADAC the best we can using wild cards
  let url = ''
  let startsWith = drug.generics.length > 1 ? '%' : ''
  let names = drug.generics.map(generic => startsWith+generic.name.toUpperCase().slice(0,4))
  let strengths = drug.generics.map(generic => generic.strength.replace(/[^0-9.]/g, '%'))

  for (let i in names)
    url += ` AND ndc_description like "${names[i]}%${strengths[i]}%"`.replace(/%+/g, '%25')

  return url
}

function goodrxUrl(endpoint, name, dosage) {
  let qs  =`name=${name}&dosage=${dosage}&api_key=f46cd9446f`.replace(/ /g, '%20')
  let sig = crypto.createHmac('sha256', 'c9lFASsZU6MEu1ilwq+/Kg==').update(qs).digest('base64').replace(/\/|\+/g, '_')
  return `https://api.goodrx.com/${endpoint}?${qs}&sig=${sig}`
}

function nadacCalculatePrice(nadac, drug) {

  let units = 1

  //Need to handle case where price is given per ml  or per gm to ensure database integrity
  if(nadac.pricing_unit == "ML" || nadac.pricing_unit == "GM") //a component of the NADAC response that described unit of price ("each", "ml", or "gm")
    units = getNumberOfUnits(nadac, drug) || units

  return formatPrice(units * nadac.nadac_per_unit)
}

function getNumberOfUnits(nadac, drug) {
  let demoninator = /\/([0-9.]+)[^\/]*$/
  let match = nadac.ndc_description.match(demoninator) || drug.generic.match(demoninator)
  return match ? +match[1] : console.log("Drug could not be converted to account for GM or ML")
}

function getGoodrx(drug) {

  let fullName = formatDrugName(drug)
  let strength = formatDrugStrength(drug)

  return goodrxApi.call(this, 'fair-price', fullName, strength).then(nameSearch => {

    if (nameSearch.price)
      return formatPrice(nameSearch.price/nameSearch.quantity)

    if ( ! nameSearch.candidate)
      return console.log('No GoodRx price or candidate found for the name '+fullName+' '+strength, nameSearch.url)

    return goodrxApi.call(this, 'fair-price', nameSearch.candidate, strength).then(candidateSearch => {

      if (candidateSearch.price)
        return formatPrice(candidateSearch.price/candidateSearch.quantity)

      console.log('No GoodRx price found for the candidate '+nameSearch.candidate+' '+strength, candidateSearch.url)
    })
  })
}

function getRetail(drug) {

  let fullName = formatDrugName(drug)
  let strength = formatDrugStrength(drug)

  return goodrxApi.call(this, 'compare-price', fullName, strength).then(nameSearch => {

    //console.log('Retail price results '+fullName+' '+strength, nameSearch)

    if (nameSearch.prices)
      return averagePrice(nameSearch)

    if ( ! nameSearch.candidate)
      return console.log('No GoodRx price or candidate found for the name '+fullName+' '+strength, nameSearch.url)

    return goodrxApi.call(this, 'compare-price', nameSearch.candidate, strength).then(candidateSearch => {

      console.log('Retail price results for candidate '+nameSearch.candidate+' '+strength, candidateSearch)

      if (candidateSearch.prices)
        return averagePrice(candidateSearch)

      console.log('No GoodRx price found for the candidate '+nameSearch.candidate+' '+strength, candidateSearch.url)
    })
  })
}

//409 error means qs not properly encoded, 400 means missing drug
function goodrxApi(endpoint, drug, strength) {
  let url = goodrxUrl(endpoint, drug, strength)
  return this.ajax({url}).then(goodrx => {
     if (goodrx.body) return goodrx.body.data
     let candidate = goodrx.error.errors && goodrx.error.errors[0].candidates && goodrx.error.errors[0].candidates[0]
     return {url, candidate, error:goodrx.error}
  })
}

//Brand better for compound name. Otherwise use first word since, suffixes like hydrochloride sometimes don't match
function formatDrugName(drug) {
  return drug.brand || drug.generics.map(generic => generic.name).join('-')+' '+drug.form
}

function formatDrugStrength(drug) {
  return drug.generics.map(generic => generic.strength.replace(' ', '')).join('-')
}

function formatPrice(price) {
  return +price.toFixed(4)
}

//Need to divide price array by savings array and then average them
function averagePrice(goodrx) {
  let sum = goodrx.prices.reduce((a, b, i) => {
    let savings = parseFloat(goodrx.price_detail.savings[i]) || 0
    return a + b/(1-savings/100)
  })
  let avg = sum / goodrx.prices.length
  return formatPrice(avg/goodrx.quantity)
}
