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
    .ensure('_rev').custom(updateTransactions).withMessage('Could not update transactions containing this drug')
    .ensure('_rev').custom(exports.setPrice).withMessage('Could not update the price of this drug')
}

//Look up the goodrx and nadac price of the drug
//Update the drug with the new price info
//Update all transactions with 0 price including any that were just entered
exports.setPrice = function(drug) {

  let nadac = getNadac.call(this, drug) //needs ndc9
  let goodrx = getGoodrx.call(this, drug)

  return Promise.all([nadac, goodrx]).then(([nadac, goodrx]) => {

    if ( ! nadac && ! goodrx) return

    drug.price.nadac  = nadac || drug.price.nadac
    drug.price.goodrx = goodrx || drug.price.goodrx
    drug.price.updatedAt = new Date().toJSON()

    console.log('Found prices', drug)
    return drug
  })
}

//Context-specific - options MUST have 'this' property in order to work.
//Get all transactins using this drug so we can update denormalized database
function updateTransactions(drug, rev, key, opts) {
  return exports.isNew(drug, opts) || this.db.transaction.query('drug._id', {key:[this.account._id, drug._id], include_docs:true})
  .then(transactions => {
    //console.log('updateTransactions', transactions)
    return Promise.all(transactions.rows.map(row => {
      let transaction = row.doc
      if(
          transaction.drug.generic == drug.generic &&
          transaction.drug.form == drug.form &&
          transaction.drug.brand == drug.brand &&
          transaction.drug.price &&
          (transaction.drug.price.goodrx || transaction.drug.price.nadac)
        )
        return

      transaction.drug.generics = drug.generics
      transaction.drug.form     = drug.form
      transaction.drug.brand    = drug.brand
      transaction.drug.generic  = drug.generic

      if ( ! transaction.drug.price.goodrx) {
        transaction.drug.price.goodrx = drug.price.goodrx
        transaction.drug.price.updatedAt = drug.price.updatedAt
      }

      if ( ! transaction.drug.price.nadac) {
        transaction.drug.price.nadac = drug.price.nadac
        transaction.drug.price.updatedAt = drug.price.updatedAt
      }
      //console.log('updateTransaction', transaction)
      //TODO _bulk_docs update would be faster (or at least catch errors with Promise.all)
      return this.db.transaction.put(transaction, {this:this, ajax:admin.ajax})
    }))
  })
  .then(puts => {
    console.log(`updated ${puts.length} transactions to have drug name ${drug.generic}`) //err.errors['shipment._id'].rules
    return true //make sure validation passes
  })
  .catch(err => {
    console.log('updateTransactions err', err.errors) //err.errors['shipment._id'].rules
  })
}

function getNadac(drug) {
  let date = new Date(); date.setMonth(date.getMonth() - 2) //Datbase not always up to date so can't always do last week.  On 2016-06-18 last as_of_date was 2016-05-11, so lets look back two months
  let url = `http://data.medicaid.gov/resource/tau9-gfwr.json?$where=as_of_date>"${date.toJSON().slice(0, -1)}"`

  return this.ajax({url:url+nadacNdcUrl(drug)})
  .then(nadac => {

    if (nadac.body && nadac.body.length)
      return nadacCalculatePrice(nadac.body.pop(), drug)

    console.log('No NADAC price found for an ndc starting with '+drug.ndc9)

    return this.ajax({url:url+nadacNameUrl(drug)})
    .then(nadac => {

      if(nadac.body && nadac.body.length)  //When the price is not found but no error is thrown
        return nadacCalculatePrice(nadac.body.pop(), drug)

      console.log('No NADAC price found for a name like', drug.generics)
    })
  })
  .catch(err => console.log('nadac err', err))
}

function nadacNdcUrl(drug) {
  return `AND starts_with(ndc,"${drug.ndc9}")`
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

function goodrxUrl(name, dosage) {
  let qs  =`name=${name}&dosage=${dosage}&api_key=f46cd9446f`.replace(/ /g, '%20')
  let sig = crypto.createHmac('sha256', 'c9lFASsZU6MEu1ilwq+/Kg==').update(qs).digest('base64').replace(/\/|\+/g, '_')
  return `https://api.goodrx.com/fair-price?${qs}&sig=${sig}`
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
  //Brand better for compound name. Otherwise use first word since, suffixes like hydrochloride sometimes don't match
  let fullName = drug.brand || drug.generics.map(generic => generic.name).join('-') //.split(' ')[0]
  let strength = drug.generics.map(generic => generic.strength.replace(' ', '')).join('-')
  //409 error means qs not properly encoded, 400 means missing drug
  let url = goodrxUrl(fullName, strength)
  return this.ajax({url}).then(goodrx => {

    if (goodrx.body)
      return formatPrice(goodrx.body.data.price/goodrx.body.data.quantity)

    console.log('No GoodRx price found for the name '+fullName+' '+strength, url)

    let substitutes = goodrx.error.errors && goodrx.error.errors[0].candidates
    if ( ! substitutes)
      return console.log('GoodRx has no substitutes for drug', drug._id, drug.generic, goodrx.error.errors, url)

    console.log(`GoodRx using price of an alternative match for ${substitutes[0]}`)
    url = goodrxUrl(substitutes[0], strength)
    return this.ajax({url}).then(goodrx => {
      if (goodrx.body)
        return formatPrice(goodrx.body.data.price/goodrx.body.data.quantity)

      return console.log("GoodRx price could not be updated with substitute either", url, goodrx)
    })
  })
}

function formatPrice(price) {
  return +price.toFixed(4)
}
