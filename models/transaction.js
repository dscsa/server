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

  retail(doc) {
    var qty   = require('qty')(doc)
    var price = doc.drug.price ? doc.drug.price.retail || require('price')(doc) : 0
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
  isRepacked(doc, includePending) {
    return (includePending || ! doc.next[0]) && doc.bin && doc.bin.length == 3
  },

  isPending(doc) {
    return doc.next[0] && doc.next[0].pending
  },

  isDispensed(doc) {
    return doc.next[0] && doc.next[0].dispensed
  },

  wasInventory(doc) {
    return require('wasBinned')(doc) || require('wasRepacked')(doc)
  },
  //Ensure that it is still verified and not unchecked after bin was set
  wasBinned(doc) {
    return doc.bin && doc.bin.length == 4
  },
  //It is on a repacked shelf
  wasRepacked(doc) {
    return doc.bin && doc.bin.length != 4
  },

  //For authorization purposes.  Only allow recipients to see their own metrics
  //TODO for naming consistency replace with to_id
  recipient_id(doc) {
    return doc.shipment._id.slice(0, 10)
  },

  //For authorization purposes.  Only allow recipients to see their own metrics
  to_id(doc) {
    return doc.shipment._id.slice(0, 10)
  },

  from_id(doc) {
    return doc.shipment._id.slice(-10)
  },

  createdAt(doc) {
    return doc._id.slice(0, 10).split('-')
  },

  updatedAt(doc) {
    return doc.updatedAt.slice(0, 10).split('-')
  },

  //when next[0] is undefined, rather than stopping emit() lets just emit the updatedAt key
  nextAt(doc) {
    return doc.next[0] ? doc.next[0].createdAt.slice(0, 10).split('-') : require('updatedAt')(doc)
  },

  shippedAt(doc) {
    return require('isReceived')(doc) ? doc.shipment._id.slice(11, 21).split('-') : require('createdAt')(doc) //createdAt is a pretty good proxy.  Only different if it takes more than one day to log the shipment
  },

  expAt(doc) {
    return (doc.exp.to || doc.exp.from).slice(0, 10).split('-')
  },

  inventoryUntil(doc) { //This is when we no longer count the item as part of our inventory because it has expired (even if it hasn't been disposed) or it has a next value (disposed, dispensed, pending, etc)

    var date = 'expAt'

    if (require('isDisposed')(doc))
      date = 'updatedAt'
    else if (doc.next[0])
      date = 'nextAt'

    return require(date)(doc)
  },

  sortedBin(doc) {
    return doc.bin[0]+doc.bin[2]+doc.bin[1]+(doc.bin[3] || '')
  },

  inventory(doc, emit, val) {

    var createdAt = require('createdAt')(doc)
    var removedAt = require('inventoryUntil')(doc)
    var to_id     = require('to_id')(doc)
    var repacked  = require('wasRepacked')(doc)
    var sortedBin = require('sortedBin')(doc)

    require('eachMonth')(createdAt, removedAt, function(year, month, last) {
      if (last) log('inventory.eachMonth '+doc.drug.generic+' '+doc._id+' '+sortedBin+' '+createdAt[0]+'-'+createdAt[1]+' '+year+' '+month+' '+removedAt[0]+'-'+removedAt[1]+' '+to_id);
      if ( ! last) emit([to_id, year, month, doc.drug.generic, doc.drug._id, ! repacked, sortedBin], val)
    })
  },

  //Sugar to make a key in the form [recipient_id, (optional) prefix(s), year, month, day]
  dateKey(doc, dateType, prefix) {
    return require('flatten')(require('recipient_id')(doc), prefix || [], require(dateType)(doc))
  },

  flatten() {
    var flatArray = []
    for (var i in arguments)
      flatArray = flatArray.concat(arguments[i])
    return flatArray
  },

  createdAtMetrics(doc, type) {
    var val = require(type)(doc)

    var metric = {}
    //Setting these as 0 keeps a consistent property order in couchdb
    metric[type+'.received']  = require('isReceived')(doc) ? val : 0
    metric[type+'.accepted']  = require('isAccepted')(doc) ? val : 0
    metric[type+'.disposed']  = 0
    metric[type+'.binned']    = 0
    metric[type+'.repacked']  = 0
    metric[type+'.pending']   = 0
    metric[type+'.dispensed'] = 0

    if (type == 'qty')
      metric['qty.in-out'] = metric['qty.received'] //In aggregate, this should be 0 because drugs in should equal drugs out

    return metric
  },

  updatedAtMetrics(doc, type) {
    var val = require(type)(doc)

    var metric = {}
    //Setting these as 0 keeps a consistent property order in couchdb
    metric[type+'.received']  = 0
    metric[type+'.accepted']  = 0
    metric[type+'.disposed']  = require('isDisposed')(doc) ? val : 0
    metric[type+'.binned']    = require('isBinned')(doc) ? val : 0
    metric[type+'.repacked']  = require('isRepacked')(doc) ? val : 0
    metric[type+'.pending']   = 0
    metric[type+'.dispensed'] = 0

    if (type == 'qty')
      metric['qty.in-out'] = - metric['qty.disposed'] - metric['qty.binned'] - metric['qty.repacked'] //In aggregate, this should be 0 because drugs in should equal drugs out

    return metric
  },

  nextAtMetrics(doc, type) {
    var val = require(type)(doc)

    var metric = {}
    //Setting these as 0 keeps a consistent property order in couchdb
    metric[type+'.received']  = 0
    metric[type+'.accepted']  = 0
    metric[type+'.disposed']  = 0
    metric[type+'.binned']    = 0
    metric[type+'.repacked']  = 0
    metric[type+'.pending']   = require('isPending')(doc) ? val : 0
    metric[type+'.dispensed'] = require('isDispensed')(doc) ? val : 0

    if (type == 'qty')
      metric['qty.in-out'] = - metric['qty.pending'] - metric['qty.dispensed'] //In aggregate, this should be 0 because drugs in should equal drugs out

    return metric
  }
}

//Transactions
exports.views = {
  //Used by history

  'next.transaction._id':function(doc) {
    for (var i in doc.next)
      doc.next[i].transaction && emit(doc.next[i].transaction._id)
  },

  //used by drug endpoint to update transactions on drug name/form updates
  'drug._id':function(doc) {
    emit([require('recipient_id')(doc), doc.drug._id])
  },

  //Client shipments page
  'shipment._id':function(doc) {
    emit([require('recipient_id')(doc), doc.shipment._id])
  },

  //Client pending drawer
  'inventory.pending':function(doc) {
    require('isPending')(doc) && emit([require('recipient_id')(doc), doc.next[0].pending._id || doc.next[0].createdAt, ! require('isRepacked')(doc, true), doc.bin[0]+doc.bin[2]+doc.bin[1]+(doc.bin[3] || '')])
  },

  //Client bin checking and reorganization, & account/bins.csv for use by data loggers needing to pick empty boxes.  Skip reduce with reduce=false.  Alphabatize within bin
  'inventory.bin':{
    map(doc) {
      require('isInventory')(doc) && emit([require('recipient_id')(doc), require('isRepacked')(doc), doc.bin.slice(0, 3), doc.bin.slice(3), doc.drug.generic])
    },
    reduce:'_count'
  },

  //Client expiration == 2018-05
  'inventory.exp':function(doc) {
    require('isInventory')(doc) && emit([require('recipient_id')(doc), doc.exp.to || doc.exp.from, ! require('isRepacked')(doc), doc.bin[0]+doc.bin[2]+doc.bin[1]+(doc.bin[3] || '')])
  },

  //Client expiration <= 2018-05 (Year to Date e.g, Jan - May 2018 but nothing in 2017 or earlier)
  'inventory.exp.ytd':function(doc) {
    if ( ! require('isInventory')(doc)) return
    var exp = (doc.exp.to || doc.exp.from).split('-')
    for (var i = +exp[1]; i <= 12; i++) {
      exp[1] = ('0'+i).slice(-2)
      emit([require('recipient_id')(doc), exp.join('-'), ! require('isRepacked')(doc), doc.bin[0]+doc.bin[2]+doc.bin[1]+(doc.bin[3] || '')])
    }
  },

  //Client shopping.  Geneic name is most Important, then expiration so we can make shopping lists via API, then repack since physically separate from other bins, and then switch bin's columns and rows to minimize walking
  'inventory.drug.generic':function(doc) {
    require('isInventory')(doc) && emit([require('recipient_id')(doc), doc.drug.generic, doc.exp.to || doc.exp.from, doc.drug._id, ! require('isRepacked')(doc), doc.bin[0]+doc.bin[2]+doc.bin[1]+(doc.bin[3] || '')])
  },

  //Backend to help if someone accidentally dispenses a drug
  'dispensed.drug.generic':function(doc) {
    require('isDispensed')(doc) && emit([require('recipient_id')(doc), doc.drug.generic])
  },

  //Backend to help if someone accidentally disposes a drug
  'disposed.drug.generic':function(doc) {
    require('isDisposed')(doc) && emit([require('recipient_id')(doc), doc.drug.generic])
  },

  //Live inventory
  inventory:{
    map(doc) {
      var qty = require('qty')(doc)
      var key = [require('recipient_id')(doc), doc.drug.generic, doc.exp.to || doc.exp.from, doc.drug._id]

      if (require('isBinned')(doc))
        emit(key, {"qty.binned":qty})

      if (require('isRepacked')(doc))
        emit(key, {"qty.repacked":qty})

      if (require('isPending')(doc))
        emit(key, {"qty.pending":qty})

      if (require('isDispensed')(doc))
        emit(key, {"qty.dispensed":qty})
    },
    reduce
  },

  'inventory.new':{
    map(doc) { //new inventory
      require('wasInventory')(doc) && require('inventory')(doc, emit, require('qty')(doc))
    },
    '_stats'
  },

  'inventory.indate':{
    map(doc) {
     var inventoryUntil  = require('inventoryUntil')(doc)
     var createdAt       = require('createdAt')(doc)
     var from_id         = require('from_id')(doc)
     var qty             = require('qty')(doc)
     var val             = require('value')(doc)
     var count           = require('count')(doc)
     var to_id           = require('to_id')(doc)
     var isBinned        = require('isBinned')(doc) && {"qty.binned":qty, "value.binned":val, "count.binned":count}
     var isRepacked      = require('isRepacked')(doc) && {"qty.repacked":qty, "value.repacked":val, "count.repacked":count}
     var isPending       = require('isPending')(doc) && {"qty.pending":qty, "value.pending":val, "count.pending":count}
     var isDispensed     = require('isDispensed')(doc) && {"qty.dispensed":qty, "value.dispensed":val, "count.dispensed":count}
     log('#1 inventory.indate '+doc._id);
     //Each month in range inclusive start, exclusive end so that if something is disposed the moment we log it doesn't count
     for (var y = +createdAt[0], m = +createdAt[1]; y < inventoryUntil[0] || m < inventoryUntil[1]; m++) {
       if (m == 13) {
         y++
         m = 1
       }

       log('inventory.indate '+doc._id+' '+createdAt[0]+'-'+createdAt[1]+' '+y+' '+inventoryUntil[0]+'-'+inventoryUntil[1]+' '+to_id+'-'+from_id);
       //convert month # back to a two character string
       var key = [to_id, y, ('0'+m).slice(-2), doc.drug.generic, doc.drug._id, from_id]

       if (isBinned)
        emit(key, isBinned)

       if (isRepacked)
        emit(key, isBinned)

       if (isPending)
        emit(key, isPending)

       if (isDispensed)
        emit(key, isDispensed)
      }
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
      emit(require('createdAt')(doc), 'in == out')

    //If it is accepted/repacked, then it is either waiting on a bin or has a bin length of 3 or 4
    if (doc.verifiedAt && ( ! doc.bin || (doc.bin.length != 3 && doc.bin.length != 4)))
      emit(require('createdAt')(doc), 'accepted but no bin')

    //If it is accepted and not yet repacked/dispensed, then why is it not in inventory or pending?
    if (require('isAccepted')(doc) && ! next.length && ! (require('isInventory')(doc) || require('isPending')(doc)))
      emit(require('createdAt')(doc), 'accepted not inventory')

    //If not accepted and not repacked, how is it in inventory/pending?
    if ( ! require('isAccepted')(doc) && ! require('isRepacked')(doc) && (require('isInventory')(doc) || require('isPending')(doc)))
      emit(require('createdAt')(doc), 'inventory not accepted')
  },

  //Used by account/:id/metrics.csv
  count:{
    map(doc) {
      emit(require('dateKey')(doc, 'createdAt'), require('createdAtMetrics')(doc, 'count'))
      emit(require('dateKey')(doc, 'updatedAt'), require('updatedAtMetrics')(doc, 'count'))
      emit(require('dateKey')(doc, 'nextAt'), require('nextAtMetrics')(doc, 'count'))
    },
    reduce
  },

  //Used by account/:id/metrics.csv
  qty:{
    map(doc) {
      emit(require('dateKey')(doc, 'createdAt'), require('createdAtMetrics')(doc, 'qty'))
      emit(require('dateKey')(doc, 'updatedAt'), require('updatedAtMetrics')(doc, 'qty'))
      emit(require('dateKey')(doc, 'nextAt'), require('nextAtMetrics')(doc, 'qty'))
    },
    reduce
  },

  //Used by account/:id/metrics.csv
  value:{
    map(doc) {
      emit(require('dateKey')(doc, 'createdAt'), require('createdAtMetrics')(doc, 'value'))
      emit(require('dateKey')(doc, 'updatedAt'), require('updatedAtMetrics')(doc, 'value'))
      emit(require('dateKey')(doc, 'nextAt'), require('nextAtMetrics')(doc, 'value'))
    },
    reduce
  },

  //Used by account/:id/metrics.csv
  retail:{
    map(doc) {
      emit(require('dateKey')(doc, 'createdAt'), require('createdAtMetrics')(doc, 'retail'))
      emit(require('dateKey')(doc, 'updatedAt'), require('updatedAtMetrics')(doc, 'retail'))
      emit(require('dateKey')(doc, 'nextAt'), require('nextAtMetrics')(doc, 'retail'))
    },
    reduce
  },

  //Used by account/:id/record.csv
  record:{
    map(doc) {
      emit(require('dateKey')(doc, 'createdAt', [doc.drug.generic, doc.drug._id]), require('createdAtMetrics')(doc, 'qty'))
      emit(require('dateKey')(doc, 'updatedAt', [doc.drug.generic, doc.drug._id]), require('updatedAtMetrics')(doc, 'qty'))
      emit(require('dateKey')(doc, 'nextAt', [doc.drug.generic, doc.drug._id]), require('nextAtMetrics')(doc, 'qty'))
    },
    reduce
  },

  //Used to track user based activity
  users:{
    map(doc) {
      emit(require('dateKey')(doc, 'createdAt', [doc.user._id]), require('createdAtMetrics')(doc, 'count'))
      emit(require('dateKey')(doc, 'updatedAt', [doc.user._id]), require('updatedAtMetrics')(doc, 'count'))
      emit(require('dateKey')(doc, 'nextAt', [doc.user._id]), require('nextAtMetrics')(doc, 'count'))
    },
    reduce
  },

  //Used by account/:id/from.csv to track metrics by state and donor
  'from.count':{
    map(doc) {
      var from = doc.shipment._id.split('.')[2]
      var key  = require('dateKey')(doc, 'shippedAt', [from])
      emit(key, require('createdAtMetrics')(doc, 'count'))
    },
    reduce
  },

  'from.qty':{
    map(doc) {
      var from = doc.shipment._id.split('.')[2]
      var key  = require('dateKey')(doc, 'shippedAt', [from])
      emit(key, require('createdAtMetrics')(doc, 'qty'))
    },
    reduce
  },

  'from.value':{
    map(doc) {
      var from = doc.shipment._id.split('.')[2]
      var key  = require('dateKey')(doc, 'shippedAt', [from])
      emit(key, require('createdAtMetrics')(doc, 'value'))
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
  //console.log('recurse 0', id)
  this.body = yield recurse(id, result)
  function *recurse (_id, list) {
    //console.log('recurse 1', _id, list, $this.account)
    let [trans, {rows:prevs}] = yield [
      $this.db.transaction.get(_id), //don't use show function because we might need to see transactions not directly authorized
      $this.db.transaction.query('next.transaction._id', {key:_id})
    ]
    //console.log('recurse 2', prevs)

    list.push(trans)
    let indentedList = []

    if (prevs.length > 1) {
      trans.type = 'Repackaged'
      list.push([indentedList])
    } else {
      trans.type = 'Transaction'
    }

    let all = [exports.lib.isReceived(trans) ? $this.db.shipment.get(trans.shipment._id) : {account:{from:$this.account}}]

    //console.log('recurse 3', all)
    //Recursive call!
    for (let prev of prevs) {
      //console.log('recurse 4', prev.id, prev._id, prev)
      all.push(recurse(prev.id, prevs.length == 1 ? list : indentedList))
    }
    //Search for transaction's ancestors and shipment in parallel
    all = yield all //TODO this is co specific won't work when upgrading to async/await which need Promise.all
    //Now we just fill in full shipment and account info into the transaction
    //console.log('recurse 5', all)
    trans.shipment = all[0]
    let account    = all[0].account
    //TODO this call is serial. Can we do in parallel with next async call?
    //TODO this is co specific won't work when upgrading to async/await which need Promise.all
    let accounts = yield [
      $this.db.account.get(account.from._id),
      account.to && $this.db.account.get(account.to._id)
    ]
    account.from = accounts[0]
    account.to   = accounts[1] //This is redundant (the next transactions from is the transactions to), but went with simplicity > speed

    delete account.from.ordered
    delete account.from.authorized
    if (account.to) {
      delete account.to.ordered
      delete account.to.authorized
    }
    //console.log('recurse 6', result)
    return result
  }
}
