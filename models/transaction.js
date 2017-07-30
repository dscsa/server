"use strict"
//defaults
module.exports = exports = Object.create(require('../helpers/model'))

let drug     = require('./drug')
let shipment = require('./shipment')
let csv = require('csv/server')

exports.lib = {

  count(doc) { //silly but used by metric lib
    return 1
  },

  qty(doc) {
    return doc.qty.to || doc.qty.from || 0
  },

  price(doc) {
    return doc.drug.price ? doc.drug.price.goodrx || doc.drug.price.nadac || 0 : 0
  },

  value(doc) {
    var qty   = require('qty')(doc)
    var price = require('price')(doc)
    return price * qty
  },

  //It came in a shipment, not restocked or repacked which both have shipment._id == account._id
  isReceived(doc) {
    return doc.shipment._id.indexOf('.') != -1
  },

  //Checkmark sets verifiedAt
  isAccepted(doc) {
    return doc.verifiedAt && require('isReceived')(doc)
  },

  //No checkmark, also includes excess drugs that were repacked but did not go into a vial.  Or no bin in case bin was never added after verifiying
  isDisposed(doc) {
    return ! doc.verifiedAt || ! doc.bin
  },

  isInventory(doc) {
    //verifiedAt is the checkmark, next can have pending, dispensed, or a transaction meaning this transaction has been used for something else
    return require('isBinned')(doc) || require('isRepacked')(doc)
  },

  //Ensure that it is still verified and not unchecked after bin was set
  isBinned(doc) {
    return ! doc.next[0] && doc.bin && doc.bin.length == 4 && doc.verifiedAt
  },

  //It is on a repacked shelf
  isRepacked(doc) {
    return ! doc.next[0] && doc.bin && doc.bin.length == 3
  },

  isPending(doc) {
    return doc.next[0] && doc.next[0].pending
  },

  isDispensed(doc) {
    return doc.next[0] && doc.next[0].dispensed
  },

  dateKey(doc) {
    return [doc.shipment._id.slice(0, 10)].concat(doc._id.slice(0, 10).split('-'))
  },

  metrics(doc, type) {
    var val = require(type)(doc)

    var metric = {}
    metric[type+'.received'] = require('isReceived')(doc) ? val : 0,
    metric[type+'.accepted'] = require('isAccepted')(doc) ? val : 0,
    metric[type+'.disposed'] = require('isDisposed')(doc) ? val : 0,
    metric[type+'.binned'] = require('isBinned')(doc) ? val : 0,
    metric[type+'.repacked'] = require('isRepacked')(doc) ? val : 0,
    metric[type+'.pending'] = require('isPending')(doc) ? val : 0,
    metric[type+'.repacked'] = require('isRepacked')(doc) ? val : 0,
    metric[type+'.dispensed'] = require('isDispensed')(doc) ? val : 0

    return metric
  }
}

//Transactions
exports.views = {
  //Used by history
  'next.transaction._id':function(doc) {
    for (var i in doc.next)
      doc.next[i].transaction && emit([doc.shipment._id.slice(0, 10), doc.next[i].transaction._id])
  },

  //used by drug endpoint to update transactions on drug name/form updates
  'drug._id':function(doc) {
    emit([doc.shipment._id.slice(0, 10), doc.drug._id])
  },

  //Client shipments page
  'shipment._id':function(doc) {
    emit([doc.shipment._id.slice(0, 10), doc.shipment._id])
  },

  //Client pending drawer
  'inventory.pendingAt':function(doc) {
    require('isPending')(doc) && emit([doc.shipment._id.slice(0, 10), doc.next[0].createdAt])
  },

  //Client bin checking and reorganizatoin
  'inventory.bin':function(doc) {
    require('isInventory')(doc) && emit([doc.shipment._id.slice(0, 10), doc.bin])
  },

  //Client expiration removal
  'inventory.exp':function(doc) {
    require('isInventory')(doc) && emit([doc.shipment._id.slice(0, 10), doc.exp.to || doc.exp.from])
  },

  //Client shopping
  'inventory.drug.generic':function(doc) {
    require('isInventory')(doc) && emit([doc.shipment._id.slice(0, 10), doc.drug.generic, ! require('isRepacked')(doc)])
  },

  //Backend to help if someone accidentally dispenses a drug
  'dispensed.drug.generic':function(doc) {
    require('isDispensed')(doc) && emit([doc.shipment._id.slice(0, 10), doc.drug.generic])
  },

  //Backend to help if someone accidentally disposes a drug
  'disposed.drug.generic':function(doc) {
    require('isDisposed')(doc) && emit([doc.shipment._id.slice(0, 10), doc.drug.generic])
  },

  //Live inventory
  inventory:{
    map(doc) {
      var qty = require('qty')(doc)
      var isBinned    = require('isBinned')(doc)
      var isPending   = require('isPending')(doc)
      var isRepacked  = require('isRepacked')(doc)
      var key         = [doc.shipment._id.slice(0, 10), doc.drug.generic, doc.drug._id]

      if (isRepacked)
        emit(key, {"qty.binned":0, "qty.pending":0, "qty.repacked":qty})

      if (isBinned)
        emit(key, {"qty.binned":qty, "qty.pending":0, "qty.repacked":0})

      if (isPending)
        emit(key, {"qty.binned":0, "qty.pending":qty, "qty.repacked":0})
    },
    reduce
  },

  //Admin backend to see if I understand the difference between accepted and current inventory
  debug(doc) {

    //If it was restocked or repacked, then it must be accepted otherwise why did we log it
    //Actually this is excess from repackaging.
    // if (doc.shipment._id.indexOf('.') == -1 && ! doc.verifiedAt)
    //   emit(require('dateKey')(doc), 'repacked or restocked but not verified')

    //If not these what is it?
    if ( ! require('isReceived')(doc) && ! require('isDisposed')(doc) && ! require('isInventory')(doc) && ! require('isPending')(doc) && ! require('isDispensed')(doc))
      emit(require('dateKey')(doc), 'in == out')

    //If it is accepted/repacked, then it is either waiting on a bin or has a bin length of 3 or 4
    if (doc.verifiedAt && ( ! doc.bin || (doc.bin.length != 3 && doc.bin.length != 4)))
      emit(require('dateKey')(doc), 'accepted but no bin')

    //If it is accepted and not yet repacked/dispensed, then why is it not in inventory or pending?
    if (require('isAccepted')(doc) && ! next.length && ! (require('isInventory')(doc) || require('isPending')(doc)))
      emit(require('dateKey')(doc), 'accepted not inventory')

    //If not accepted and not repacked, how is it in inventory/pending?
    if ( ! require('isAccepted')(doc) && ! require('isRepacked')(doc) && (require('isInventory')(doc) || require('isPending')(doc)))
      emit(require('dateKey')(doc), 'inventory not accepted')
  },

  //Used by account/:id/metrics.csv
  count:{
    map(doc) {
      emit(require('dateKey')(doc), require('metrics')(doc, 'count'))
    },
    reduce
  },

  //Used by account/:id/metrics.csv
  qty:{
    map(doc) {
      emit(require('dateKey')(doc), require('metrics')(doc, 'qty'))
    },
    reduce
  },

  //Used by account/:id/metrics.csv
  value:{
    map(doc) {
      emit(require('dateKey')(doc), require('metrics')(doc, 'value'))
    },
    reduce
  },

  //Used by account/:id/record.csv
  record:{
    map(doc) {
      var date = doc._id.slice(0, 10).split('-')
      emit([doc.shipment._id.slice(0, 10), doc.drug.generic, date[0], date[1], date[2], doc._id], require('metrics')(doc, 'qty'))
    },
    reduce
  },

  //Used to track user based activity
  users:{
    map(doc) {
      var date = doc._id.slice(0, 10).split('-')
      emit([doc.shipment._id.slice(0, 10), doc.user._id, date[0], date[1], date[2]], require('metrics')(doc, 'count'))
    },
    reduce
  }
}

function reduce(ids, vals, rereduce) {
  // reduce function give overflow (too many keys?) if not put into a property.
  var result = {}

  for(var i in vals)
    for (var metric in vals[i])
      result[metric] = (result[metric] || 0) + (vals[i][metric] || 0)

  return result
}

exports.get_csv = function*(db) {
  const opts = {startkey:[this.account._id], endkey:[this.account._id, {}], include_docs:true}
  let view = yield this.db.transaction.query('shipment._id', opts)
  this.body = csv.fromJSON(view.rows)
  this.type = 'text/csv'
}

//Server-side validation methods to supplement shared ones.
exports.validate = function(model) {
  return model
    .ensure('isChecked').set(doc => undefined) //client sets this but we don't want to save it
    .ensure('shipment._id').custom(authorized).withMessage('You are not authorized to modify this transaction')
    .ensure('drug').set(updateDrug).withMessage('Could not get drug information')
}

//Context-specific - options MUST have 'this' property in order to work.
function authorized(doc, shipment_id) {
  var id = shipment_id.split(".")
  return id[0] == this.account._id || id[2] == this.account._id
}

//Context-specific - options MUST have 'this' property in order to work.
function updateDrug(doc, key, val, opts) {
  //Making sure drug property is accurate and upto date is
  //too costly to do on every save so just do it on creation
  if ( ! exports.isNew(doc, opts))
    return doc.drug

  return this.db.drug.get(doc.drug._id).then(drug => {
    let res = updatePrice.call(this, drug)
    return res
  })
}

function updatePrice(drug) {
  if (drug.price && (new Date() - new Date(drug.price.updatedAt) < 7*24*60*60*1000)) //this has body in {"ok":doc} formate
    return Promise.resolve(drug)

  return {
    _id:drug._id,
    price:drug.price,
    brand:drug.brand,
    generic:drug.generic,
    generics:drug.generics,
    form:drug.form,
    pkg:drug.pkg
  }

  //TODO destructuring
  return Promise.all([getNadac.call(this, drug), getGoodrx.call(this, drug)]).then(prices => {
    drug.price        = drug.price || {}
    drug.price.nadac  = prices[0]  || drug.price.nadac
    drug.price.goodrx = prices[1]  || drug.price.goodrx
    drug.price.updatedAt = new Date().toJSON()
  })
}

function *getNadac(drug) {
  //Datbase not always up to date so can't always do last week.  On 2016-06-18 last as_of_date was 2016-05-11.
  let date = new Date(new Date().getFullYear(), 0, 1).toJSON().slice(0, -1)
  let baseUrl  = `http://data.medicaid.gov/resource/tau9-gfwr.json?$where=as_of_date>"${date}"`
  let prices = ""

  try {
    let url1 = `${baseUrl} AND starts_with(ndc,"${drug.ndc9}")`
    prices = yield this.ajax({url:url1})
    if ( ! prices.length) //API returns a status of 200 even on failure ;-(
      throw console.log('No NADAC price found for an ndc starting with '+drug.ndc9)
  } catch (err1) {
    let url2 = baseUrl
    let delimiter = drug.generics.length > 1 ? '%' : ''
    for (generic of drug.generics) {
      let str = generic.strength.replace(/[^0-9.]/g, '%')
      let name = delimiter+generic.name.toUpperCase().slice(0,4)
      url2 += ` AND ndc_description like "${name}%${str}%"`.replace(/%+/g, '%25') //In order to make sure Chrome recognizes as % symbol, necessary to represent wildcard in api
    }

    try{
      prices = yield this.ajax({url:url2})

      if( ! prices.length)  //When the price is not found but no error is thrown
        throw console.log('No NADAC price found for an ndc starting with '+err+' or by name '+url)

    } catch (err2) {
      return console.log(url1, err1, url2, err2, drug, prices)
    }
  }

  let res = prices.pop()

  //Need to handle case where price is given per ml  or per gm to ensure database integrity
  if(res.pricing_unit == "ML" || res.pricing_unit == "GM"){ //a component of the NADAC response that described unit of price ("each", "ml", or "gm")
    let numberOfMLGM = res.ndc_description.match(/\/([0-9.]+)[^\/]*$/) //looks for the denominator in strength to determine per unit cost, not per ml or gm

    if( ! numberOfMLGM)  //responds null if there is no denominator value in strength given by NADAC
      numberOfMLGM = drug.generic.match(/\/([0-9.]+)[^\/]*$/) //in cases where our data contains proper generic and NADAC doesn't, try to check that as wel

    if( ! numberOfMLGM){ //Meaning even our generic data does not have the conversion factor
      console.log("Drug could not be converted to account for GM or ML") //At this point we have no way of converting
    } else {
      let total = +numberOfMLGM[1] * +res.nadac_per_unit //at this point, we have a conversion factor we can use
      //console.trace("Converted from price/ml or price/gm to price/unit of: ", total)
      return +total.toFixed(4)
    }
  }

  return +(+res.nadac_per_unit).toFixed(4) //In other case where price is found, will return here
}

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
    price = yield this.ajax({url:fullNameUrl})
  } catch(err) {
    try {
      if( ! err.errors || ! err.errors[0].candidates) //then there's no fair price drug so this is undefined
        return console.trace('GoodRx responded that there is no fair price for', err, drug._id, drug.generic, fullNameUrl)

      candidateUrl = makeUrl(err.errors[0].candidates[0], strength)
      price = yield this.ajax({url:candidateUrl})
      console.trace("GoodRx substituting a candidate", err.errors[0].candidates[0], 'for', drug._id, drug.generic)
    } catch(err2) {
      //409 error means qs not properly encoded, 400 means missing drug
      return console.trace("GoodRx price could not be updated", this.status, this.message, price, drug._id, drug.generics, fullNameUrl, candidateUrl)
    }
  }

  if ( ! price.data.quantity)
    return console.trace('GoodRx did not return a quantity', price) || null

  return +(price.data.price/price.data.quantity).toFixed(4)
}

//TODO don't search for shipment if shipment._id doesn't have two periods (inventory)
//TODO option to include full from/to account information
exports.history = function *history(id) {
  let $this = this
  let result = []

  this.body = yield recurse(id, result)
  function *recurse (_id, list) {
    let [trans, {rows:prevs}] = yield [
      $this.db.transaction.get(_id), //don't use show function because we might need to see transactions not directly authorized
      $this.db.transaction.query('next.transaction._id', {key:_id})
    ]
    let all = [$this.db.shipment.get(trans.shipment._id)]
    list.push(trans)
    let indentedList = []

    if (prevs.length > 1) {
      trans.type = 'Repackaged'
      list.push([indentedList])
    } else {
      trans.type = 'Transaction'
    }
    //Recursive call!
    for (let prev of prevs)
      all.push(recurse(prev._id, prevs.length == 1 ? list : indentedList))
    //Search for transaction's ancestors and shipment in parallel
    all = yield all //TODO this is co specific won't work when upgrading to async/await which need Promise.all
    //Now we just fill in full shipment and account info into the transaction
    trans.shipment = all[0]
    let account    = all[0].account
    //TODO this call is serial. Can we do in parallel with next async call?
    //TODO this is co specific won't work when upgrading to async/await which need Promise.all
    let accounts = yield [
      $this.db.account.get(account.from._id),
      account.to && $this.db.account.get(account.from._id)
    ]
    account.from = accounts[0]
    account.to   = accounts[1] //This is redundant (the next transactions from is the transactions to), but went with simplicity > speed
    return result
  }
}
