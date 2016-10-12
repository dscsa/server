"use strict"
let drug     = require('./drug')
let shipment = require('./shipment')

exports.lib = {
  generic:drug.generic,
  validDrug:drug.lib.validDrug,
  validShipmentId:shipment.lib.validShipmentId,
  qtyRemaining(doc) {
    function sum(sum, next) {
      return sum + next.qty
    }

    return (doc.qty.to || doc.qty.from) - doc.next.reduce(sum, 0)
  },
  isInventory(doc) {
    return doc.verifiedAt && require('qtyRemaining')(doc) > 0 //inventory only
  }
}

exports.docRoles = function(doc, emit) {
  //Determine whether user is authorized to see the doc
  doc.shipment._id.split('.').slice(0, 2).forEach(emit)
}

exports.userRoles = (ctx, emit) => {
  ctx.session && emit(ctx.session.account._id)
}

exports.validate = function(newDoc, oldDoc, userCtx) {
  var id = /^[a-z0-9]{7}$/
  var ensure          = require('ensure')('transaction', arguments)
  var qtyRemaining    = require('qtyRemaining')
  var validShipmentId = require('validShipmentId')

  if ( ! userCtx.roles.length)
    return 'You must be logged in to save a transaction'

  if ( ! newDoc._deleted)
    require('validDrug')('transaction.drug', newDoc.drug, oldDoc && oldDoc.drug, userCtx)

  //Required
  ensure('_id').notNull.regex(id)
  //ensure('user._id').notNull.assert(id)
  ensure('shipment._id').isString.assert(validShipmentId)
  ensure('createdAt').notNull.isDate.notChanged
  ensure('verifiedAt').isDate.assert(verified)
  ensure('next').notNull.isArray.assert(next)
  ensure('next.qty').isNumber
  ensure('history').assert(history)

  //Optional
  ensure('qty.from').isNumber.assert(validQty)
  ensure('qty.to').isNumber.assert(validQty)
  ensure('exp.from').isDate
  ensure('exp.to').isDate
  ensure('location').regex(/[A-Z]\d{3}|UNIT/)
  ensure('drug.price.goodrx').isNumber
  ensure('drug.price.nadac').isNumber

  function validQty(qty) {
    if (qty != null && qty < 1 || qty > 999) return 'qty must be between 1 and 999'
  }

  function verified(date) {
    if ( ! date) return
    if ( ! newDoc.location && qtyRemaining(newDoc) > 0) return 'cannot be set unless a valid box is set'
    if ( ! newDoc.qty.from && ! newDoc.qty.to) return 'cannot be set unless a valid qty is set'
    if ( ! newDoc.exp.from && ! newDoc.exp.to) return 'cannot be set unless a valid exp is set'
  }

  //TODO next.transaction || next.dispensed must exist (and eventually have _id)
  function next(val) {
    if (val.length && ! newDoc.verifiedAt)
      return 'cannot contain any values unless transaction.verifiedAt is set'

    if (qtyRemaining(newDoc) < 0)
      return 'sum of quantities in "next" cannot be larger than newDoc.qty.to || newDoc.qty.from'
  }

  function history(val) {
    return val && 'history cannot be set in version 3'
  }
}

exports.view = {
  history(doc) {
    for (var i in doc.next)
      doc.next[i].transaction && emit(doc.next[i].transaction._id)
  },

  //used by drug endpoint to update transactions on drug name/form updates
  drugs(doc) {
    emit(doc.drug._id)
  },

  shipment(doc) {
    emitRole(doc.shipment._id)
  },

  //TODO How to incorporate Complete/Verified/Destroyed, multiple map functions?  compound key e.g., [createAt, typeof verified] with grouping?
  record(doc) {
    doc.shipment._id.split('.').length == 3 && emitRole(doc.createdAt)
  },

  //For inventory search.
  inventoryGeneric(doc) {
    require('isInventory')(doc) && emitRole(doc.drug.generic)
  },

  inventoryLocation(doc) {
    require('isInventory')(doc) && emitRole(doc.location)
  },

  inventoryExp(doc) {
    require('isInventory')(doc) && emitRole(doc.exp.to || doc.exp.from)
  },

  inventoryGenericSum:{
    map(doc) {
       doc.verifiedAt && emitRole(doc.drug.generic, require('qtyRemaining')(doc))
    },
    reduce:"_sum"
  },

  transactionCount:{
    map(doc) {
       var key = doc.createdAt.slice(0, 10).split('-')
       emit(key.concat(doc.user && doc.user._id))
    },
    reduce:"_count"
  },

  potentialErrors(doc) {
     var price = doc.drug.price.goodrx || doc.drug.price.nadac || 0
     var qty   = doc.qty.to || doc.qty.from || 0
     var value = Math.floor(price*qty)
     if (value > 1000)
      emit(['Value > $1000', value])
  },

  valueByCreatedAt:{
    map(doc) {
       var date   = doc.createdAt.slice(0, 10).split('-')
       var price = doc.drug.price.goodrx || doc.drug.price.nadac || 0
       var qty   = doc.qty.to || doc.qty.from || 0
       emit(date, Math.floor(price*qty))
    },
    reduce:"_sum"
  },

  valueByExp:{
    map(doc) {
      var date  = doc.exp.to || doc.exp.from || ''
      var price = doc.drug.price.goodrx || doc.drug.price.nadac || 0
      var qty   = doc.qty.to || doc.qty.from || 0
      emit(date.slice(0, 10).split('-'), Math.floor(price*qty))
    },
    reduce:"_sum"
  }
}

exports.get = function* () {

  let url, s = JSON.parse(this.query.selector)

  if (this.query.history && s._id)
    return this.body = yield history(this, s._id)

  if (s.createdAt && s.createdAt.$gte && s.createdAt.$lte) {
    this.req.setTimeout(10000)
    return yield this.db.transaction.list.record(s.createdAt.$gte, s.createdAt.$lte)
  }

  if (s.inventory && s.exp)
    return yield this.db.transaction.list.inventoryExp(s.exp, true, {limit:this.query.limit})

  if (s.inventory && s.location)
    return yield this.db.transaction.list.inventoryLocation(s.location, true, {limit:this.query.limit})

  if (s.inventory == "sum") //Don't force generic, so that we can sum all inventory
    return yield this.db.transaction.list.inventoryGenericSum(s.generic)

  if (s.inventory && s.generic)
    return yield this.db.transaction.list.inventoryGeneric(s.generic)

  if (s.inventory) //Export all inventory
    return yield this.db.transaction.list.inventoryGeneric()

  if (s['shipment._id']) {
    //console.log('this.transaction', this.transaction)
    return yield this.db.transaction.list.shipment(s['shipment._id'])
  }

  //TODO remove this once bulk_get is supported and we no longer need to handle replication through regular get
  if (s._id)
    return yield this.query.open_revs
      ? this.http.get('transaction/'+s._id)
      : this.transaction.db.list.id(s._id)
}

exports.post = function* () {

  let doc = yield this.http.body

  defaults.call(this, doc)

  //Making sure these are accurate and upto date is too
  //costly to do on every save so just do it on creation
  let drugs = yield this.db.drug.list.id(doc.drug._id).body
  yield drug.updatePrice.call(this, drugs[0])

  doc.drug.price    = drugs[0].price
  doc.drug.brand    = drugs[0].brand
  doc.drug.generic  = drugs[0].generic
  doc.drug.generics = drugs[0].generics
  doc.drug.form     = drugs[0].form

  let id = this.http.id
  let save = yield this.http.put('transaction/'+id, doc).body

  doc._id  = save.id
  doc._rev = save.rev
  this.body = doc
}

exports.put = function* () {
  let doc = yield this.http.body
  defaults(doc)
  let save = yield this.http('transaction/'+doc._id, doc).body
  doc._rev = save.rev
  this.body = doc
}

//TODO enforce drug consistency on every save?
exports.bulk_docs = function* () {
  yield this.http()
}

exports.delete = function* () {
  let doc = yield this.http.body

  if (doc.next.length)
    this.throw(409, `Cannot delete this transaction because it has subsequent transactions in "next" property`)

  //TODO delete all elements in transaction.nexts that have this transaction listed
  //Need to think through whether these items would get put back into inventory or what

  yield this.http('transaction/'+doc._id+'?rev='+doc._rev, doc)
}

function defaults(body) {
  //TODO ensure that there is a qty
  body.next      = body.next || []
  body.createdAt = body.createdAt || new Date().toJSON()

  //TODO [TypeError: Cannot read property 'to' of undefined] is malformed request
  //Empty string -> null, string -> number, number -> number (including 0)
  body.qty.to     = body.qty.to != null && body.qty.to !== '' ? +body.qty.to : null     //don't turn null to 0 since it will get erased
  body.qty.from   = body.qty.from != null && body.qty.from !== '' ? +body.qty.from : null //don't turn null to 0 since it will get erased
  body.shipment   = body.shipment && body.shipment._id ? body.shipment : {_id:this.session.account._id}

  return body
}

//TODO don't search for shipment if shipment._id doesn't have two periods (inventory)
//TODO option to include full from/to account information
function *history($this, id) {

  let result = []

  return yield history(id, result)

  function *history (_id, list) {

    let trans = yield $this.http.get('transaction/'+_id).body //don't use show function because we might need to see transactions not directly authorized
    let prevs = yield $this.db.transaction.list.history(_id).body  //TODO is there a way to use "joins" http://docs.couchdb.org/en/stable/couchapp/views/joins.html to make this more elegant
    let all   = [$this.http.get('shipment/'+trans.shipment._id).body]
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
      all.push(history(prev._id, prevs.length == 1 ? list : indentedList))

    //Search for transaction's ancestors and shipment in parallel
    all = yield all //TODO this is co specific won't work when upgrading to async/await which need Promise.all

    //Now we just fill in full shipment and account info into the transaction
    trans.shipment = all[0]
    let account    = all[0].account

    //TODO this call is serial. Can we do in parallel with next async call?
    //TODO this is co specific won't work when upgrading to async/await which need Promise.all
    let accounts = yield [
      $this.http.get('account/'+account.from._id).body,
      account.to && $this.http.get('account/'+account.to._id).body
    ]

    account.from = accounts[0]
    account.to   = accounts[1] //This is redundant (the next transactions from is the transactions to), but went with simplicity > speed
    return result
  }
}


/* Makeshift PATCH */
// function *patch(id, updates) {
//
//   let doc  = yield this.http.get(view.id(id))
//   let save = yield this.http.put('transaction/'+id).body(Object.assign(doc, updates))
//
//   doc._rev = save.rev
//   return doc
// }


// exports.verified = {
//   *post() {
//     let doc = yield this.http.body
//     let inv = yield this.http.get(view.history(doc._id))
//
//     //TODO We should make sure verifiedAt is saved as true for this transaction
//     if (inv[0])
//       this.throw(409, `Cannot verify this transaction because transaction ${inv[0]._id} with _id ${doc._id} already has this transaction in its history`)
//
//     doc = yield patch.call(this, doc._id, {verifiedAt:new Date().toJSON()}) //Verify transaction and send back new _rev so user can continue to make edits
//
//     //Create the new inventory item
//     inv = defaults.call(this, {
//       drug:doc.drug,
//       verifiedAt:null,
//       history:[{
//         transaction:{_id:doc._id},
//         qty:doc.qty.to || doc.qty.from
//       }],
//       qty:{
//         to:null,
//         from:doc.qty.to || doc.qty.from
//       },
//       exp:doc.exp && {
//         to:null,
//         from:doc.exp.to || doc.exp.from
//       },
//       lot:doc.lot && {
//         to:null,
//         from:doc.lot.to || doc.lot.from
//       }
//       location:doc.location
//     })
//
//     yield this.http.put('transaction/'+this.http.id).body(inv)
//     this.body = doc
//     //TODO rollback transaction verification if this creation fails
//   },
//
//   //This is a bit complex here are the steps:
//   //1. Does this transaction id have a matching inventory item. No? Already un-verified
//   //2. Can this inventory item be deleted. No? a subsequent transaction is based on this verification so it cannot be undone
//   //3. Delete the item with inventory._id
//   //4. Update the original transaction with verified_at = null
//   *delete() {
//     let doc = yield this.http.body
//     let inv = yield this.http.get(view.history(doc._id))
//     inv = inv[0]
//
//     if ( ! inv) //Only delete inventory if it actually exists
//       this.throw(409, `Cannot unverify this transaction because no subsequent transaction with history containing ${doc._id} could be found`)
//
//     if (inv.shipment._id != this.session.account._id)
//       this.throw(409, `Cannot unverify this transaction because the subsequent transaction ${inv._id} has already been assigned to another shipment`)
//
//     yield this.http.delete('transaction/'+inv._id+'?rev='+inv._rev).body(inv)
//     this.body = yield patch.call(this, doc._id, {verifiedAt:null}) //Un-verify transaction and send back new _rev so user can continue to make edits
//   }
// }
