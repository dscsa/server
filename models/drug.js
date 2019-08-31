"use strict"
//defaults
module.exports = exports = Object.create(require('../helpers/model'))

let crypto = require('crypto')
let csv    = require('csv/server')
let keys   = require('../../../keys/dev.js')
let admin  = {ajax:{jar:false, auth:keys.couch}}

//Drugs
exports.views = {
  'name':function(doc) {

    if (doc.brand)
      emit(doc.brand.toLowerCase())

    for (var i = 0; i < doc.generics.length; i++) {
      if ( ! doc.generics[i].name)
        log('generic map error for', doc.generics.length, i, doc.generics[i].name, doc.generics[i], doc)
      else
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

  //Ensure that all GSN codes are the same for a generic
  //Get rid of null values so we don't have duplicated names first with "null" and second with ""
  'by-generic-gsns':{
    map(doc) {
      emit([doc.generic, doc.gsns || "", doc.brand || ""], [doc.price.nadac || 0, doc.price.goodrx || 0, doc.price.retail || 0])
    },
    reduce:'_stats'
  },

  //Ensure that all labeler codes have the same manufacturer
  'by-labelcode-labeler':function(doc) {
    emit([doc._id.split('-')[0], doc.labeler])
  }

}

exports.get_csv = async function (ctx, db) {
  let view = await ctx.db.drug.allDocs({endkey:'_design', include_docs:true})
  ctx.body = csv.fromJSON(view.rows)
  ctx.type = 'text/csv'
}

//Server-side validation methods to supplement shared ones.
exports.validate = function(model) {
  return model
    .ensure('_rev').trigger(updatePrice).withMessage('Could not update the price of this drug')
    .ensure('_rev').trigger(updateTransactionsWithBrand).withMessage('Could not update drug.brand on all transactions')
    .ensure('_rev').trigger(updateTransactionsWithGeneric).withMessage('Could not update drug.generic on all transactions')
    .ensure('_rev').trigger(updateTransactionsWithGSNs).withMessage('Could not update GSNs on all transactions')
    .ensure('_rev').trigger(updateDrugsWithBrand).withMessage('Could not update brand name on all drugs')
    .ensure('_rev').trigger(updateDrugsWithLabeler).withMessage('Could not update labeler on all drugs')
    .ensure('_rev').trigger(updateDrugsWithGSNs).withMessage('Could not update GSNs on all drugs')
}

function updatePrice(drug, opts) {
  //This drug rev was saved to pouchdb on client.  We can't update this _rev with a price
  //without causing a discrepancy between the client and server.  Instead, we wait for a
  //bit and then save the price info to a new _rev which will replicate back to the client
  if ( ! opts.ajax) //don't let our other update functions trigger this or A LOT of drugs will be updated
    return exports.updatePrice(opts.ctx, drug, 500)
}

//GET the full drug first since want this to work with both drug and transaction.drug
//the get is not wasteful since
//Look up the goodrx and nadac price of the drug
//Update the drug with the new price info
//Update all transactions with 0 price including any that were just entered
exports.updatePrice = function(ctx, drug, delay) {

  return getPrice(ctx, drug)
  .then(price => {
    console.log('drug.updatePrice', price)
    if (price)
      setTimeout(_ => {
        ctx.db.drug.get(drug._id)
        .then(drug => {
          drug.price = price
          return ctx.db.drug.put(drug, {ctx})
        })
        .catch(err => console.log('drug.updatePrice saving err', err))
      }, delay)

    return price
  })
  .catch(err => console.log('drug.updatePrice getting err', err))
}

function getPrice(ctx, drug) {

  if (new Date() < new Date(drug.price.invalidAt) )
    return Promise.resolve(false)

  let nadac     = getNadac(ctx, drug) //needs ndc9
  let goodrx    = getGoodrx(ctx, drug)
  let retail    = getRetail(ctx, drug)
  let invalidAt = new Date(Date.now()+7*24*60*60*1000).toJSON().slice(0, 10) //Auto-filled prices expire in one week

  return Promise.all([nadac, goodrx, retail]).then(all => {
    return {nadac:all[0], goodrx:all[1], retail:all[2], invalidAt}
  })
}

//Update denormalized database
//Context-specific - options MUST have 'ctx' property in order to work.
function updateDrugsWithLabeler(drug, opts) {
  let ctx = opts.ctx
  const delayed = () => {

    let labelcode = drug._id.split('-')[0]

    Promise.all([
      ctx.db.drug.query('by-labelcode-labeler', {startkey:[labelcode], endkey:[labelcode, drug.labeler], include_docs:true, inclusive_end:false}),
      ctx.db.drug.query('by-labelcode-labeler', {startkey:[labelcode, drug.labeler, {}], endkey:[labelcode, {}], include_docs:true}),
      ctx.db.drug.query('by-labelcode-labeler', {startkey:[labelcode], endkey:[labelcode, {}]})
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

      return ctx.db.drug.bulkDocs(wrongLabeler, {ctx, jar:false, ajax:admin.ajax})

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
function updateDrugsWithBrand(drug, opts) {
  let ctx = opts.ctx
  const delayed = () => {

    Promise.all([
      ctx.db.drug.query('by-generic-brand', {startkey:[drug.generic], endkey:[drug.generic, drug.brand], include_docs:true, inclusive_end:false}),
      ctx.db.drug.query('by-generic-brand', {startkey:[drug.generic, drug.brand, {}], endkey:[drug.generic, {}], include_docs:true}),
      ctx.db.drug.query('by-generic-brand', {startkey:[drug.generic], endkey:[drug.generic, {}]})
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
      return ctx.db.drug.bulkDocs(wrongBrand, {ctx, jar:false, ajax:admin.ajax})

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
function updateDrugsWithGSNs(drug, opts) {
  let ctx = opts.ctx
  const delayed = () => {

    Promise.all([
      ctx.db.drug.query('by-generic-gsns', {startkey:[drug.generic], endkey:[drug.generic, drug.gsns], reduce:false, include_docs:true, inclusive_end:false}),
      ctx.db.drug.query('by-generic-gsns', {startkey:[drug.generic, drug.gsns, {}], endkey:[drug.generic, {}], reduce:false, include_docs:true}),
      ctx.db.drug.query('by-generic-gsns', {startkey:[drug.generic], endkey:[drug.generic, {}], reduce:false})
    ]).then(([ltGsns, gtGsns, allGsns]) => {

      let wrongGsns = ltGsns.rows.concat(gtGsns.rows)
      console.log('Updating', wrongGsns.length, 'of', allGsns.rows.length, 'drugs with GSNs', drug.gsns)

      if ( ! wrongGsns.length) return

      wrongGsns = wrongGsns.map(row => {
        console.log(row.doc.gsns, '-->', drug.gsns, row.doc._id, row.doc.generic)
        row.doc.gsns = drug.gsns
        return row.doc
      })

      //console.log('updateDrugsWithGsns', JSON.stringify(wrongGsns, null, ' '))
      return ctx.db.drug.bulkDocs(wrongGsns, {ctx, jar:false, ajax:admin.ajax})

    }).catch(err => {
      console.log('updateDrugsWithGSNs err', err) //err.errors['shipment._id'].rules
    })
  }

  if ( ! opts.ajax) //since this saves back to drug db it can cause an infinite loop  if not careful
    setTimeout(delayed, 1000)

  return true
}

//Update denormalized database
//Context-specific - options MUST have 'this' property in order to work.
function updateTransactionsWithBrand(drug, opts) {
  let ctx = opts.ctx
  const delayed = () => {

    Promise.all([
      ctx.db.transaction.query('by-generic-brand', {startkey:[drug.generic], endkey:[drug.generic, drug.brand], include_docs:true, inclusive_end:false}),
      ctx.db.transaction.query('by-generic-brand', {startkey:[drug.generic, drug.brand, {}], endkey:[drug.generic, {}], include_docs:true}),
      ctx.db.transaction.query('by-generic-brand', {startkey:[drug.generic], endkey:[drug.generic, {}]})
    ]).then(([ltBrand, gtBrand, allBrand]) => {

      let wrongBrand = ltBrand.rows.concat(gtBrand.rows)
      console.log('Updating', wrongBrand.length, 'of', allBrand.rows.length, 'transactions with brand name', drug.brand)

      if ( ! wrongBrand.length) return

      wrongBrand = wrongBrand.map(row => {
        console.log( row.doc.drug.brand, '-->', drug.brand, row.doc._id, row.doc.drug._id, row.doc.drug.generic)
        row.doc.drug.brand = drug.brand
        return row.doc
      })

      return ctx.db.transaction.bulkDocs(wrongBrand, {ctx, jar:false, ajax:admin.ajax})

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
function updateTransactionsWithGSNs(drug, opts) {
  let ctx = opts.ctx
  const delayed = () => {

    Promise.all([
      ctx.db.transaction.query('by-generic-gsns', {startkey:[drug.generic], endkey:[drug.generic, drug.gsns], include_docs:true, inclusive_end:false}),
      ctx.db.transaction.query('by-generic-gsns', {startkey:[drug.generic, drug.gsns, {}], endkey:[drug.generic, {}], include_docs:true}),
      ctx.db.transaction.query('by-generic-gsns', {startkey:[drug.generic], endkey:[drug.generic, {}]})
    ]).then(([ltGsns, gtGsns, allGsns]) => {

      let wrongGsns = ltGsns.rows.concat(gtGsns.rows)
      console.log('Updating', wrongGsns.length, 'of', allGsns.rows.length, 'transactions with GSN numbers', drug.gsns)

      if ( ! wrongGsns.length) return

      wrongGsns = wrongGsns.map(row => {
        console.log( row.doc.drug.gsns, '-->', drug.gsns, row.doc._id, row.doc.drug._id, row.doc.drug.generic)
        row.doc.drug.gsns = drug.gsns
        return row.doc
      })

      return ctx.db.transaction.bulkDocs(wrongGsns, {ctx, jar:false, ajax:admin.ajax})

    }).catch(err => {
      console.log('updateTransactionsWithGSNs err', err) //err.errors['shipment._id'].rules
    })
  }

  if ( ! opts.ajax)
    setTimeout(delayed, 1000)

  return true
}

//Update denormalized database
//Context-specific - options MUST have 'this' property in order to work.
function updateTransactionsWithGeneric(drug, opts) {
  let ctx = opts.ctx
  const delayed = () => {

    Promise.all([
      ctx.db.transaction.query('by-ndc-generic', {startkey:[drug._id], endkey:[drug._id, drug.generic, drug.form], include_docs:true, inclusive_end:false}),
      ctx.db.transaction.query('by-ndc-generic', {startkey:[drug._id, drug.generic, drug.form, {}], endkey:[drug._id, {}], include_docs:true}),
      ctx.db.transaction.query('by-ndc-generic', {startkey:[drug._id], endkey:[drug._id, {}]})
    ]).then(([ltGeneric, gtGeneric, allGeneric]) => {

      let wrongGeneric = ltGeneric.rows.concat(gtGeneric.rows)
      console.log('Updating', wrongGeneric.length, 'of', allGeneric.rows.length, 'transactions with generic name and form', drug.generic, drug.form)

      if ( ! wrongGeneric.length) return

      //TODO this will miss an update of Tablets <--> Capsules because that won't cause a change in the generic name.  I think this is okay at least for now
      wrongGeneric = wrongGeneric.map(row => {
        console.log( row.doc.drug.generic,  '-->', drug.generic, ' | ', row.doc.drug.form,  '-->', drug.form, row.doc._id, row.doc.drug._id)
        row.doc.drug.generic  = drug.generic
        row.doc.drug.generics = drug.generics
        row.doc.drug.form     = drug.form
        return row.doc
      })

      return ctx.db.transaction.bulkDocs(wrongGeneric, {ctx, jar:false, ajax:admin.ajax})

    }).catch(err => {
      console.log('updateTransactionsWithGeneric err', err) //err.errors['shipment._id'].rules
    })
  }

  if ( ! opts.ajax)
    setTimeout(delayed, 1000)

  return true
}

function getNadac(ctx, drug) {
  let date = new Date(); date.setMonth(date.getMonth() - 2) //Datbase not always up to date so can't always do last week.  On 2016-06-18 last as_of_date was 2016-05-11, so lets look back two months
  let url = `http://data.medicaid.gov/resource/tau9-gfwr.json?$where=as_of_date>"${date.toJSON().slice(0, -1)}"`

  let ndcUrl = url+nadacNdcUrl(drug)
  return ctx.ajax({url:ndcUrl})
  .then(nadac => {

    if (nadac.body && nadac.body.length)
      return nadacCalculatePrice(nadac.body.pop(), drug)

    console.log('No NADAC price found for an ndc starting with '+drug.ndc9, ndcUrl)
    let nameUrl = url+nadacNameUrl(drug)
    return ctx.ajax({url:nameUrl})
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
  let qs  =`name=${name}&dosage=${dosage}&api_key=${keys.goodrx.username}`.replace(/ /g, '%20')
  let sig = crypto.createHmac('sha256', keys.goodrx.password).update(qs).digest('base64').replace(/\/|\+/g, '_')
  let url = `https://api.goodrx.com/${endpoint}?${qs}&sig=${sig}`
  console.log(url)
  return url
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

function getGoodrx(ctx, drug) {

  let fullName = formatDrugName(drug)
  let strength = formatDrugStrength(drug)

  return goodrxApi(ctx, 'fair-price', fullName, strength).then(nameSearch => {

    if (nameSearch.price)
      return formatPrice(nameSearch.price/nameSearch.quantity)

    if ( ! nameSearch.candidate)
      return console.log('No GoodRx price or candidate found for the name '+fullName+' '+strength, nameSearch.url)

    return goodrxApi(ctx, 'fair-price', nameSearch.candidate, strength).then(candidateSearch => {

      if (candidateSearch.price)
        return formatPrice(candidateSearch.price/candidateSearch.quantity)

      console.log('No GoodRx price found for the candidate '+nameSearch.candidate+' '+strength, candidateSearch.url)
    })
  })
}

function getRetail(ctx, drug) {

  let fullName = formatDrugName(drug)
  let strength = formatDrugStrength(drug)

  return goodrxApi(ctx, 'compare-price', fullName, strength).then(nameSearch => {

    //console.log('Retail price results '+fullName+' '+strength, nameSearch)

    if (nameSearch.prices)
      return averagePrice(nameSearch)

    if ( ! nameSearch.candidate)
      return console.log('No GoodRx price or candidate found for the name '+fullName+' '+strength, nameSearch.url)

    return goodrxApi(ctx, 'compare-price', nameSearch.candidate, strength).then(candidateSearch => {

      console.log('Retail price results for candidate '+nameSearch.candidate+' '+strength, candidateSearch)

      if (candidateSearch.prices)
        return averagePrice(candidateSearch)

      console.log('No GoodRx price found for the candidate '+nameSearch.candidate+' '+strength, candidateSearch.url)
    })
  })
}

//409 error means qs not properly encoded, 400 means missing drug
function goodrxApi(ctx, endpoint, drug, strength) {
  let url = goodrxUrl(endpoint, drug, strength)
  return ctx.ajax({url}).then(goodrx => {
     if (goodrx.body) return goodrx.body.data
     let candidate = goodrx.error.errors && goodrx.error.errors[0] && goodrx.error.errors[0].candidates && goodrx.error.errors[0].candidates[0]
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
