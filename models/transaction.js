"use strict"
//defaults
module.exports = exports = Object.create(require('../helpers/model'))

let drug     = require('./drug')
let shipment = require('./shipment')
let csv = require('csv/server')
let crypto = require('crypto')
let admin  = {ajax:{auth:require('../../../keys/dev.js')}}


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

    //This should be 0 because drugs in should equal drugs out
    if (type == 'qty')
      metric['qty.in-out'] = metric['qty.received'] - metric['qty.disposed'] - metric['qty.binned'] - metric['qty.repacked'] - metric['qty.pending'] - metric['qty.dispensed']

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

  //Client bin checking and reorganizatoin.  Skip reduce with reduce=false
  'inventory.bin':{
    map(doc) {
      require('isInventory')(doc) && emit([doc.shipment._id.slice(0, 10), doc.bin.slice(0, 3), doc.bin.slice(3)])
    },
    reduce:'_count'
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

      var isBinned     = require('isBinned')(doc)
      var isPending    = require('isPending')(doc)
      var isRepacked   = require('isRepacked')(doc)
      var isDispensed  = require('isDispensed')(doc)

      var key          = [doc.shipment._id.slice(0, 10), doc.drug.generic, doc.drug._id]

      if (isRepacked)
        emit(key, {"qty.binned":0, "qty.pending":0, "qty.repacked":qty, 'qty.dispensed':0})

      if (isBinned)
        emit(key, {"qty.binned":qty, "qty.pending":0, "qty.repacked":0, 'qty.dispensed':0})

      if (isPending)
        emit(key, {"qty.binned":0, "qty.pending":qty, "qty.repacked":0, 'qty.dispensed':0})

      if (isDispensed)
        emit(key, {"qty.binned":0, "qty.pending":0, "qty.repacked":0, 'qty.dispensed':qty})
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
      emit([doc.shipment._id.slice(0, 10), doc.drug.generic, doc.drug._id, date[0], date[1], date[2], doc._id], require('metrics')(doc, 'qty'))
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
    .ensure('drug.price').trigger(updatePrice).withMessage("Could not get update the drug's price for this transaction")
}

//Context-specific - options MUST have 'this' property in order to work.
function authorized(doc, shipment_id) {
  var id = shipment_id.split(".")
  return id[0] == this.account._id || id[2] == this.account._id
}

function updatePrice(doc, oldPrice, key, opts) {

  if (oldPrice.goodrx && oldPrice.nadac) return

  //This transaction will save, so we can't update this _rev with a price
  //without causing a discrepancy between the client and server.  Instead, we wait for a
  //tranaction with any edit to be fully entered and then save the price info to a new _rev which will replicate back to the client
  return drug.updatePrice.call(this, doc.drug, 15000)
  .then(newPrice => {

    if ( ! newPrice) return //price was up-to-date
    //don't override the prices that are already set
    oldPrice.nadac = oldPrice.nadac || newPrice.nadac
    oldPrice.goodrx = oldPrice.goodrx || newPrice.goodrx
    console.log('Updated the price of the drug '+doc.drug._id+' for this transaction', doc)
  })
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
