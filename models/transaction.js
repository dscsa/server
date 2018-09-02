"use strict"
//defaults

//TODO replace all recipient_id with TO_ID
//TODO replace all with sortedBin
//TODO replace all isXXX with wasXXX
//TODO remove deprecations

module.exports = exports = Object.create(require('../helpers/model'))

let drug     = require('./drug')
let shipment = require('./shipment')
let csv = require('csv/server')
let crypto = require('crypto')
let admin  = {ajax:{auth:require('../../../keys/dev.js')}}


exports.lib = {

  qty(doc) {
    return doc.qty.to || doc.qty.from || 0
  },

  price(doc) {
    return doc.drug.price ? doc.drug.price.goodrx || doc.drug.price.nadac || doc.drug.price.retail || 0 : 0
  },

  value(doc) {
    return +(require('price')(doc) * require('qty')(doc)).toFixed(2)
  },

  //For authorization purposes.  Only allow recipients to see their own metrics
  to_id(doc) {
    return doc.shipment && doc.shipment._id.slice(0, 10)
  },

  //Identify the donor (for repacked this is the same as the recipient)
  from_id(doc) {
    return doc.shipment && doc.shipment._id.slice(-10)
  },

  createdAt(doc) {
    return doc._id.slice(0, 10).split('-')
  },

  receivedAt(doc) {
    return doc.shipment && ~ doc.shipment._id.indexOf('.') && doc.shipment._id.slice(11, 21).split('-')
  },

  //Don't count repacks as verified even though verifiedAt is set, becase then we could have verified > received
  verifiedAt(doc) {
    return doc.verifiedAt && doc.verifiedAt.slice(0, 10).split('-')
  },

  //TODO In case next.length > 1 we may need to do a loop.  Break at first key with "dispensed" prop?
  //see 'next.transaction._id' view for an example
  nextAt(doc) {
    return doc.next[0] && doc.next[0].createdAt.slice(0, 10).split('-')
  },

  //TODO see above
  refusedAt(doc) {
    var nextAt = require('nextAt')(doc)
    var receivedAt = require('receivedAt')(doc)
    return ( ! doc.verifiedAt && receivedAt) && nextAt && doc.next[0].disposed && nextAt
  },

  //TODO see above
  //To differentiate from refused, it must either be checked on the shipment page (verifiedAt), be disposed on inventory page, or be automatically disposed excess from repacking
  disposedAt(doc) {
    var nextAt = require('nextAt')(doc)
    var receivedAt = require('receivedAt')(doc)
    return (doc.verifiedAt || ! receivedAt) && nextAt && doc.next[0].disposed && nextAt
  },

  //TODO see above
  dispensedAt(doc) {
    var nextAt = require('nextAt')(doc)
    return nextAt && doc.next[0].dispensed && nextAt
  },

  //TODO see above
  pendedAt(doc) {
    var nextAt = require('nextAt')(doc)
    return nextAt && doc.next[0].pended && nextAt
  },

  //This is when we no longer count the item as part of our inventory because it has expired (even if it hasn't been disposed) or it has a next value (disposed, dispensed, pended, etc)
  //if months is the number of months to subtract. This does not adjust days so subtracting 1 month from March 31st will give Febuaray 31st.
  expiredAt(doc, months) {
    var exp = doc.exp.to || doc.exp.from
    exp = exp && exp.slice(0, 10).split('-')

    if ( ! exp || ! months) return exp || false

    exp[0] -= Math.floor(months/12)
    exp[1] -= months % 12

    exp[0] = '' + exp[0]
    exp[1] = ('0' + exp[1]).slice(-2)

    return exp
  },

  //This includes unpulled expired, no-way to remove those from view
  //removes all pended, dispensed, disposed, and previous (repacked)
  isInventory(doc) {
    return doc.bin && ! doc.next.length
  },

  isBinned(doc) {
    return require('isInventory')(doc) && doc.bin.length == 4
  },

  isRepacked(doc) {
    return require('isInventory')(doc) && doc.bin.length != 4
  },

  //Because of Unicode collation order would be a000, A000, a001 even if I put delimiters like a space or comma inbetween characters
  //putting into an array seemed like the only remaining option http://docs.couchdb.org/en/stable/ddocs/views/collation.html#collation-specification
  sortedBin(doc) {
    if ( ! doc.bin) return []
    var binArr = ['', doc.bin[0], doc.bin[2], doc.bin[1], doc.bin[3]]           //we don't want shopper to walk backwards so this makes all movement forward
    return doc.bin[3] ? binArr.slice(1) : binArr.slice(0, -1)
  },

  groupByDate(emit, doc, stage, key, val) {
    var date = require(stage+'At')(doc)

    if ( ! date || ! val) return //don't emit disposed items with qty 0 or it throws off count

    var to_id = require('to_id')(doc)
    emit([to_id, ''].concat(key), val)
    emit([to_id, 'year',  date[0]].concat(key), val)
    emit([to_id, 'month', date[0], date[1]].concat(key), val)
    emit([to_id, 'day',   date[0], date[1], date[2]].concat(key), val)
    emit([to_id, key[0],  date[0], date[1], date[2]].concat(key.slice(1)), val) //If we want to search for a particular field rather than show all and group (Form 8283 and Data Entry Time Sheet)
  },

  //fromDate, toDate must be date arrays.
  //Inclusive, Callback(yyyy<string>, mm<string>, isLastMonth)
  eachMonth(fromDate, toDate, callback) {

    ///If toDate is not provided goto end of from date's year
    if ( ! callback) {
      callback = toDate
      toDate[0] = fromDate[0]
      toDate[1] = 12
    }

    if ( ! toDate) return log('eachMonth NO toDate:'+toDate+' fromDate:'+fromDate.join('-'))

    //Each month in range inclusive start, exclusive end so that if something is disposed the moment we log it doesn't count
    for (var y = +fromDate[0], m = +fromDate[1]; y < toDate[0] || m < toDate[1]; m++) {
      if (m == 13) { y++; m = 0; continue }
      callback(''+y, ('0'+m).slice(-2))
    }
    callback(''+y, ('0'+m).slice(-2), true)
  },

  expired(emit, doc, val) {
    if ( ! require('isInventory')(doc)) return
    var to_id     = require('to_id')(doc)
    var expiredAt = require('expiredAt')(doc)
    var sortedBin = require('sortedBin')(doc)
    require('eachMonth')(expiredAt, function(year, month, last) {
      emit([to_id, year, month].concat(sortedBin), val)
    })
  },

  inventory(emit, doc, key, val) {

    var createdAt  = require('createdAt')(doc)
    var removedAt  = require('nextAt')(doc) || require('expiredAt')(doc)
    var to_id      = require('to_id')(doc)

    require('eachMonth')(createdAt, removedAt, function(year, month, last) {
      if (last) return  //don't count it as inventory in the month that it was removed (expired okay since we use until end of the month)
      emit([to_id, 'month', year, month].concat(key), val) //gsns and brand are used by the live inventory page
      if (month == 12) emit([to_id, 'year', year].concat(key), val) //gsns and brand are used by the live inventory page
    })
  }
}

//1. Client (Public) Endpoints

//2. Server (Private) Endpoints for finding and updating denormalized data, etc.
//Transaction History, Update Brand Name across drugs, Update manufacturers across drugs, Update drug names across transactions

//3. Basic Metrics (Viewed in Google Sheets) for non-expired drugs that were in inventory for a given month:
//Uses: How much was received today?  How much did this user log?
//inventory.binned qty,val,count, inventory.repacked qty,val,count, inventory.pended qty,val,count,
//Key [to, y/m date until expired/next, drug, ndc, bin]

//4. Inventory Metrics (Viewed in Google Sheets) for non-expired drugs that were in inventory for a given month:
//Uses: Live Inventory, Audits
//inventory.binned qty,val,count, inventory.repacked qty,val,count, inventory.pended qty,val,count,
//Key [to, y/m date until expired/next, drug, ndc, bin]

//5. Year to Date Reports (helpful when grouping by drug at given date such as Audits, Inspections)
//Uses: Any aggregates that we need by drug at a specific point in time: Donor Reports, Live Inventory Dispensing Estimate, Inspection Record
//received.ytd, verified.ytd, ....
//Can't do any point in time here because unlike Inventory these states could be indefinite in length
//Key [to, y/m date until end of year, drug, ndc]

//6. Backups
//Export of all inventory in case v2 goes down. (Handled by 1?)
//Full CSV back up of each database

//7. Backend Debugging
//Received qty,val,count, Verified, Disposed, Dispensed, Expired
//Key [to, Year, Month, Day, User] (can we make timesheet with this key order?)

//8. DEPRECATED views

exports.views = {

  //*** 1. Pure property lookups  ***

  //Client shipments page
  'shipment._id':function(doc) {
    emit([require('to_id')(doc), doc.shipment._id])
  },

  //*** 2. Server (Private) Endpoints ***
  //Used by history
  'next.transaction._id':function(doc) {
    for (var i in doc.next)
      doc.next[i].transaction && emit(doc.next[i].transaction._id)
  },

  //Used by drug endpoint to update transactions on drug name/form updates
  'by-ndc-generic':function(doc) {
    emit([doc.drug._id, doc.drug.generic])
  },

  'by-generic-price':function(doc) {
     emit([doc.drug.generic, require('price')(doc)])
  },

  //Along with the drug.js counterpart, Will be used to make sure all brand names are consistent for a given generic name
  'by-generic-brand':function(doc) {
    emit([doc.drug.generic, doc.drug.brand])
  },

  //Along with the drug.js counterpart, Will be used to make sure all gsn numbers are consistent for a given generic name
  'by-generic-gsns':function(doc) {
    emit([doc.drug.generic, doc.drug.gsns])
  },

  //*** 2. Filtered View  ***
  'pended-by-name-bin':function(doc) {
    require('pendedAt')(doc) && emit([require('to_id')(doc), doc.next[0].pended._id || doc.next[0].createdAt, doc.exp.to || doc.exp.from, require('sortedBin')(doc)])
  },

  //Client bin checking and reorganization, & account/bins.csv for use by data loggers needing to pick empty boxes.  Skip reduce with reduce=false.  Alphabatize within bin
  //Split bin because of weird unicode collation a < A < aa so upper and lower case bins were getting mixed in search results http://docs.couchdb.org/en/stable/ddocs/views/collation.html
  'inventory-by-bin-verifiedat':{
    map(doc) {
      if ( ! require('isInventory')(doc)) return
      var bin  = require('sortedBin')(doc)
      var qty  = require('qty')(doc)
      var date = require('verifiedAt')(doc)
      emit([require('to_id')(doc)].concat(bin).concat(date), qty)
    },
    reduce:'_stats'
  },

  //NOTE THIS IS YEAR TO DATE (NOT AN EXACTLY WHEN EXPIRED)
  //Pulling expired: endkey=[to_id, 2018, 06]
  //V2 Drugs Page // stage == 'inventory' ? sortedBin :  doc.drug.generic
  //Metrics Page (next to received, verified, disposed, pended, dispensed, ??inventory/repack/binned??)
  'expired.qty-by-bin':{
    map(doc) {
      require('expired')(emit, doc, require('qty')(doc))
    },
    reduce:'_stats'
  },

  //Inventory at the end of each month (so we do not count the last month)
  //An item is in inventory from the moment it is created (not verified because verified is unset once destroyed) until the moment it is removed (next property is set) or until it expires
  //We do a loop because couchdb cannot filter and group on different fields.  Emitting [exp, drug] would filter and group on exp.
  //Emitting [drug, exp] would filter and group by drug.  We want to group by drug and filter by exp.  To achieve this we emit
  //every month between the item being added and when it leaves inventory (see above).  This way search for [2018, 06] doesn't just
  //give us 2018-06 items but all items before that too e.g 2018-05, 2018-04 .... until createdAt date.  In this way the Exp filter
  //is built into the view itself and doesn't require us to use start and end keys to filter by exp, and in this way we can group by drug

  //Live Inventory [to_id, year, month+2]?group_level=4
  //Inventory Download [to_id, year, month+2]?group_level=false
  //v2 Inventory [to_id, year, month+2, Drug Name]
  //v2 Drugs [to_id, year, month+2, Drug Name]?group_level=5 (inventory/dispense/disposed/pended/repacked)
  //Audit Inventory [to_id, year-1, 12]?group_level=4

  'inventory.qty-by-generic':{
    map(doc) {
      require('inventory')(emit, doc, [doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('qty')(doc))
    },
    reduce:'_stats'
  },

  'inventory.value-by-generic':{
    map(doc) {
      require('inventory')(emit, doc, [doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('value')(doc))
    },
    reduce:'_stats'
  },

  //ReceivedAt not equal to CreatedAt (and therefore not Verified+Refused) because shipment could be created one day but items not logged until the following day(s)
  'received.qty-by-generic':{
    map(doc) {
      require('receivedAt')(doc) && require('groupByDate')(emit, doc, 'created', [doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('qty')(doc))
    },
    reduce:'_stats'
  },

  //ReceivedAt not equal to CreatedAt (and therefore not Verified+Refused) because shipment could be created one day but items not logged until the following day(s)
  'received.value-by-generic':{
    map(doc) {
      require('receivedAt')(doc) && require('groupByDate')(emit, doc, 'created', [doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('value')(doc))
    },
    reduce:'_stats'
  },

  'refused.qty-by-generic':{
    map(doc) {
      require('groupByDate')(emit, doc, 'refused', [doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('qty')(doc))
    },
    reduce:'_stats'
  },

  'refused.value-by-generic':{
    map(doc) {
      require('groupByDate')(emit, doc, 'refused', [doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('value')(doc))
    },
    reduce:'_stats'
  },

  'verified.qty-by-generic':{
    map(doc) {
      require('groupByDate')(emit, doc, 'verified', [doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('qty')(doc))
    },
    reduce:'_stats'
  },

  'verified.value-by-generic':{
    map(doc) {
      require('groupByDate')(emit, doc, 'verified', [doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('value')(doc))
    },
    reduce:'_stats'
  },

  'expired.qty-by-generic':{
    map(doc) {
      var expired  = require('expiredAt')(doc, 1) || []
      var disposed = require('disposedAt')(doc)
      var next     = require('nextAt')(doc)

      //If we remove something a month before the expiration date, use the disposed date not the expired date, but still label it as expired rather than disposed  //If we remove something a month before the expiration date, use the disposed date not the expired date, but still label it as expired rather than disposed
      //if not disposed, dispensed, or repacked then use the expiration date because its still in our inventory.  Without out this the formula previous_inventory + verified != disposed + expired + dispensed + current_inventory for every period
      if (disposed ? expired.join('-') < disposed.join('-') : ! next)
        require('groupByDate')(emit, doc, 'expired', [doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('qty')(doc))
    },
    reduce:'_stats'
  },

  'expired.value-by-generic':{
    map(doc) {
      var expired  = require('expiredAt')(doc, 1) || []
      var disposed = require('disposedAt')(doc)
      var next     = require('nextAt')(doc)

      //If we remove something a month before the expiration date, use the disposed date not the expired date, but still label it as expired rather than disposed  //If we remove something a month before the expiration date, use the disposed date not the expired date, but still label it as expired rather than disposed
      //if not disposed, dispensed, or repacked then use the expiration date because its still in our inventory.  Without out this the formula previous_inventory + verified != disposed + expired + dispensed + current_inventory for every period
      if (disposed ? expired.join('-') < disposed.join('-') : ! next)
        require('groupByDate')(emit, doc, disposed ? 'disposed' : 'expired', [doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('value')(doc))
    },
    reduce:'_stats'
  },

  'disposed.qty-by-generic':{
    map(doc) {
      var expired  = require('expiredAt')(doc, 1)
      var disposed = require('disposedAt')(doc)

      if (disposed && ( ! expired || expired.join('-') > disposed.join('-')))
        require('groupByDate')(emit, doc, 'disposed', [doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('qty')(doc))
    },
    reduce:'_stats'
  },

  'disposed.value-by-generic':{
    map(doc) {
      var expired  = require('expiredAt')(doc, 1)
      var disposed = require('disposedAt')(doc)

      if (disposed && ( ! expired || expired.join('-') > disposed.join('-')))
        require('groupByDate')(emit, doc, 'disposed', [doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('value')(doc))
    },
    reduce:'_stats'
  },

  'dispensed.qty-by-generic':{
    map(doc) {
      require('groupByDate')(emit, doc, 'dispensed', [doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('qty')(doc))
    },
    reduce:'_stats'
  },

  'dispensed.value-by-generic':{
    map(doc) {
      require('groupByDate')(emit, doc, 'dispensed', [doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('value')(doc))
    },
    reduce:'_stats'
  },

  'pended.qty-by-generic':{
    map(doc) {
      require('groupByDate')(emit, doc, 'pended', [doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('qty')(doc))
    },
    reduce:'_stats'
  },

  'pended.value-by-generic':{
    map(doc) {
      require('groupByDate')(emit, doc, 'pended', [doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('value')(doc))
    },
    reduce:'_stats'
  },

  //ReceivedAt not equal to CreatedAt (and therefore not Verified+Refused) because shipment could be created one day but items not logged until the following day(s)
  'received.qty-by-from-generic':{
    map(doc) {
      require('receivedAt')(doc) && require('groupByDate')(emit, doc, 'created', [require('from_id')(doc), doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('qty')(doc))
    },
    reduce:'_stats'
  },

  //ReceivedAt not equal to CreatedAt (and therefore not Verified+Refused) because shipment could be created one day but items not logged until the following day(s)
  'received.value-by-from-generic':{
    map(doc) {
      require('receivedAt')(doc) && require('groupByDate')(emit, doc, 'created', [require('from_id')(doc), doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('value')(doc))
    },
    reduce:'_stats'
  },

  'refused.qty-by-from-generic':{
    map(doc) {
      require('groupByDate')(emit, doc, 'refused', [require('from_id')(doc), doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('qty')(doc))
    },
    reduce:'_stats'
  },

  'refused.value-by-from-generic':{
    map(doc) {
      require('groupByDate')(emit, doc, 'refused', [require('from_id')(doc), doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('value')(doc))
    },
    reduce:'_stats'
  },

  'verified.qty-by-from-generic':{
    map(doc) {
      require('groupByDate')(emit, doc, 'verified', [require('from_id')(doc), doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('qty')(doc))
    },
    reduce:'_stats'
  },

  'verified.value-by-from-generic':{
    map(doc) {
      require('groupByDate')(emit, doc, 'verified', [require('from_id')(doc), doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('value')(doc))
    },
    reduce:'_stats'
  },

  'expired.qty-by-from-generic':{
    map(doc) {
      var expired  = require('expiredAt')(doc, 1) || []
      var disposed = require('disposedAt')(doc)
      var next     = require('nextAt')(doc)

      //If we remove something a month before the expiration date, use the disposed date not the expired date, but still label it as expired rather than disposed  //If we remove something a month before the expiration date, use the disposed date not the expired date, but still label it as expired rather than disposed
      //if not disposed, dispensed, or repacked then use the expiration date because its still in our inventory.  Without out this the formula previous_inventory + verified != disposed + expired + dispensed + current_inventory for every period
      if (disposed ? expired.join('-') < disposed.join('-') : ! next)
        require('groupByDate')(emit, doc, disposed ? 'disposed' : 'expired', [require('from_id')(doc), doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('qty')(doc))
    },
    reduce:'_stats'
  },

  'expired.value-by-from-generic':{
    map(doc) {
      var expired  = require('expiredAt')(doc, 1) || []
      var disposed = require('disposedAt')(doc)
      var next     = require('nextAt')(doc)

      //If we remove something a month before the expiration date, use the disposed date not the expired date, but still label it as expired rather than disposed  //If we remove something a month before the expiration date, use the disposed date not the expired date, but still label it as expired rather than disposed
      //if not disposed, dispensed, or repacked then use the expiration date because its still in our inventory.  Without out this the formula previous_inventory + verified != disposed + expired + dispensed + current_inventory for every period
      if (disposed ? expired.join('-') < disposed.join('-') : ! next)
        require('groupByDate')(emit, doc, disposed ? 'disposed' : 'expired', [require('from_id')(doc), doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('value')(doc))
    },
    reduce:'_stats'
  },

  'disposed.qty-by-from-generic':{
    map(doc) {
      var expired  = require('expiredAt')(doc, 1)
      var disposed = require('disposedAt')(doc)

      if (disposed && ( ! expired || expired.join('-') > disposed.join('-')))
        require('groupByDate')(emit, doc, 'disposed', [require('from_id')(doc), doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('qty')(doc))
    },
    reduce:'_stats'
  },

  'disposed.value-by-from-generic':{
    map(doc) {
      var expired  = require('expiredAt')(doc, 1)
      var disposed = require('disposedAt')(doc)

      if (disposed && ( ! expired || expired.join('-') > disposed.join('-')))
        require('groupByDate')(emit, doc, 'disposed', [require('from_id')(doc), doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('value')(doc))
    },
    reduce:'_stats'
  },

  'dispensed.qty-by-from-generic':{
    map(doc) {
      require('groupByDate')(emit, doc, 'dispensed', [require('from_id')(doc), doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('qty')(doc))
    },
    reduce:'_stats'
  },

  'dispensed.value-by-from-generic':{
    map(doc) {
      require('groupByDate')(emit, doc, 'dispensed', [require('from_id')(doc), doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('value')(doc))
    },
    reduce:'_stats'
  },

  'pended.qty-by-from-generic':{
    map(doc) {
      require('groupByDate')(emit, doc, 'pended', [require('from_id')(doc), doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('qty')(doc))
    },
    reduce:'_stats'
  },

  'pended.value-by-from-generic':{
    map(doc) {
      require('groupByDate')(emit, doc, 'pended', [require('from_id')(doc), doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('value')(doc))
    },
    reduce:'_stats'
  },

  'inventory.qty-by-from-generic':{
    map(doc) {
      require('inventory')(emit, doc, [require('from_id')(doc), doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('qty')(doc))
    },
    reduce:'_stats'
  },

  'inventory.value-by-from-generic':{
    map(doc) {
      require('inventory')(emit, doc, [require('from_id')(doc), doc.drug.generic, doc.drug.gsns, doc.drug.brand, doc.drug._id, doc.exp.to || doc.exp.from, require('sortedBin')(doc), doc.bin, doc._id], require('value')(doc))
    },
    reduce:'_stats'
  },

  //ReceivedAt not equal to CreatedAt (and therefore not Verified+Refused) because shipment could be created one day but items not logged until the following day(s)
  'received.qty-by-user-from-shipment':{
    map(doc) {
      require('receivedAt')(doc) && require('groupByDate')(emit, doc, 'created', [doc.user._id, require('from_id')(doc), doc.shipment._id, doc.bin, doc._id], require('qty')(doc))
    },
    reduce:'_stats'
  },

  'refused.qty-by-user-from-shipment':{
    map(doc) {
      require('groupByDate')(emit, doc, 'refused', [doc.user._id, require('from_id')(doc), doc.shipment._id, doc.bin, doc._id], require('qty')(doc))
    },
    reduce:'_stats'
  },

  'verified.qty-by-user-from-shipment':{
    map(doc) {
      require('groupByDate')(emit, doc, 'verified', [doc.user._id, require('from_id')(doc), doc.shipment._id, doc.bin, doc._id], require('qty')(doc))
    },
    reduce:'_stats'
  },

  'expired.qty-by-user-from-shipment':{
    map(doc) {
      var expired  = require('expiredAt')(doc, 1) || []
      var disposed = require('disposedAt')(doc)
      var next     = require('nextAt')(doc)

      //If we remove something a month before the expiration date, use the disposed date not the expired date, but still label it as expired rather than disposed  //If we remove something a month before the expiration date, use the disposed date not the expired date, but still label it as expired rather than disposed
      //if not disposed, dispensed, or repacked then use the expiration date because its still in our inventory.  Without out this the formula previous_inventory + verified != disposed + expired + dispensed + current_inventory for every period
      if (disposed ? expired.join('-') < disposed.join('-') : ! next)
        require('groupByDate')(emit, doc, disposed ? 'disposed' : 'expired', [doc.user._id, require('from_id')(doc), doc.shipment._id, doc.bin, doc._id], require('qty')(doc))
    },
    reduce:'_stats'
  },

  'disposed.qty-by-user-from-shipment':{
    map(doc) {
      var expired  = require('expiredAt')(doc, 1)
      var disposed = require('disposedAt')(doc)

      if (disposed && ( ! expired || expired.join('-') > disposed.join('-')))
        require('groupByDate')(emit, doc, 'disposed', [doc.user._id, require('from_id')(doc), doc.shipment._id, doc.bin, doc._id], require('qty')(doc))
    },
    reduce:'_stats'
  },

  'dispensed.qty-by-user-from-shipment':{
    map(doc) {
      require('groupByDate')(emit, doc, 'dispensed', [doc.user._id, require('from_id')(doc), doc.shipment._id, doc.bin, doc._id], require('qty')(doc))
    },
    reduce:'_stats'
  },

  'pended.qty-by-user-from-shipment':{
    map(doc) {
      require('groupByDate')(emit, doc, 'pended', [doc.user._id, require('from_id')(doc), doc.shipment._id, doc.bin, doc._id], require('qty')(doc))
    },
    reduce:'_stats'
  },

  'inventory.qty-by-user-from-shipment':{
    map(doc) {
      require('inventory')(emit, doc, [doc.user._id, require('from_id')(doc), doc.shipment._id, doc.bin, doc._id], require('qty')(doc))
    },
    reduce:'_stats'
  }
}

exports.get_csv = async function (ctx, db) {
  const opts = {startkey:[ctx.account._id], endkey:[ctx.account._id, {}], include_docs:true}
  let view = await ctx.db.transaction.query('shipment._id', opts)
  ctx.body = csv.fromJSON(view.rows)
  ctx.type = 'text/csv'
}

//Server-side validation methods to supplement shared ones.
exports.validate = function(model) {
  return model
    .ensure('isChecked').set(doc => undefined) //client sets this but we don't want to save it
    .ensure('_rev').custom(authorized).withMessage('You are not authorized to modify this transaction')
}

//Context-specific - options MUST have 'ctx' property in order to work.
function authorized(doc, opts) {
  var id = doc.shipment._id.split('.')
  return id[0] == opts.ctx.account._id || id[2] == opts.ctx.account._id
}

//TODO don't search for shipment if shipment._id doesn't have two periods (inventory)
//TODO option to include full from/to account information
exports.history = async function history(ctx, id) {

  let result = []
  //console.log('recurse 0', id)
  ctx.body = await recurse(id, result)

  async function recurse (_id, list) {
    //console.log('recurse 1', _id, list, ctx.account)
    let [trans, {rows:prevs}] = await Promise.all([
      ctx.db.transaction.get(_id), //don't use show function because we might need to see transactions not directly authorized
      ctx.db.transaction.query('next.transaction._id', {key:_id})
    ])
    //console.log('recurse 2', prevs)

    list.push(trans)
    let indentedList = []

    if (prevs.length > 1) {
      trans.type = 'Repackaged'
      list.push([indentedList])
    } else {
      trans.type = 'Transaction'
    }

    let all = [exports.lib.receivedAt(trans) ? ctx.db.shipment.get(trans.shipment._id) : {account:{from:ctx.account}}]

    //console.log('recurse 3', all)
    //Recursive call!
    for (let prev of prevs) {
      //console.log('recurse 4', prev.id, prev._id, prev)
      all.push(recurse(prev.id, prevs.length == 1 ? list : indentedList))
    }
    //Search for transaction's ancestors and shipment in parallel
    all = await Promise.all(all) //TODO this is co specific won't work when upgrading to async/await which need Promise.all
    //Now we just fill in full shipment and account info into the transaction
    //console.log('recurse 5', all)
    trans.shipment = all[0]
    let account    = all[0].account
    //TODO this call is serial. Can we do in parallel with next async call?
    //TODO this is co specific won't work when upgrading to async/await which need Promise.all
    let accounts = await Promise.all([
      ctx.db.account.get(account.from._id),
      account.to && ctx.db.account.get(account.to._id)
    ])
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
