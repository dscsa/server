"use strict"
let drugs = require('./drug')

exports.validate_doc_update = function(newDoc, oldDoc, userCtx) {

  // if ( ! userCtx.roles[0])
  //   throw({unauthorized:'You must be logged in to create or modify a transaction'})

  if (newDoc._id.slice(0, 7) == '_local/') return
  if (newDoc._deleted) return

  var id = /^[a-z0-9]{7}$/
  ensure.prefix = 'transaction'

  //Required
  ensure('_id').notNull.regex(id)
  ensure('shipment._id').assert(shipmentId)
  ensure('createdAt').notNull.isDate.notChanged
  ensure('verifiedAt').isDate.assert(verifiedAt)
  ensure('history').notNull.isArray
  ensure('history.transaction._id').notNull.regex(id)
  ensure('history.qty').notNull.isNumber
  ensure('drug._id').notNull.regex(/^\d{4}-\d{4}|\d{5}-\d{3}|\d{5}-\d{4}$/)
  ensure('drug.generics').notNull.isArray.length(1, 10)
  ensure('drug.generics.name').notNull.isString.length(1, 50)
  ensure('drug.generics.strength').isString.length(0, 20)
  ensure('drug.brand').isString.length(0, 20)
  ensure('drug.form').notNull.isString.length(1, 20)
  ensure('drug.pkg').isString.length(0, 2).notChanged
  ensure('drug.price.updatedAt').notNull.isDate

  //Optional
  ensure('qty.from').isNumber
  ensure('qty.to').isNumber
  ensure('exp.from').isDate
  ensure('exp.to').isDate
  ensure('drug.price.goodrx').isNumber
  ensure('drug.price.nadac').isNumber

  function shipmentId(val) {

    if (typeof val != 'string')
      return 'is required to be a valid _id'

    val = val.split('.')

    if (val[0] == val[1])
      return 'cannot have account.from._id == account.to._id'

    if (val.length == 3 && id.test(val[2])) {
      if (val[0]   == userCtx.roles[0] && id.test(val[1])) return
      if (val[1]   == userCtx.roles[0] && id.test(val[0])) return
      if ("_admin" == userCtx.roles[0] && id.test(val[0]) && id.test(val[1])) return
    }

    if(val.length == 1 && (val[0] == userCtx.roles[0] || '_admin' == userCtx.roles[0])) return

    return 'must be in the format "account.from._id" or "account.from._id"."account.to._id"."_id"'
  }

  function verifiedAt(val) {
    if (val && ! newDoc.qty.to && ! newDoc.qty.from)
      return 'cannot be set if neither "qty.to" nor "qty.from" is set'
  }
}

//Note ./startup.js saves views,filters,and shows as toString into couchdb and then replaces
//them with a function that takes a key and returns the couchdb url needed to call them.
exports.filter = {
  authorized(doc, req) {
    if ( ! doc.shipment) return doc._deleted //true for _deleted false for _design

    var account  = req.userCtx.roles[0]   //called from PUT or CouchDB

    var accounts = doc.shipment._id.split('.')
    return accounts[0] == account || accounts[1] == account
  },

  inventory(doc, req) {
    //called from PUT or CouchDB, true for _deleted false for _design
    return doc.shipment ? doc.shipment._id == req.userCtx.roles[0] : doc._deleted
  }
}

exports.show = {
  authorized(doc, req) {
    if ( ! doc) return {code:204}

    var account  = req.userCtx.roles[0]   //called from PUT or CouchDB
    var accounts = doc.shipment._id.split('.')

    if (accounts[0] == account || accounts[1] == account)
      return toJSON(req.query.open_revs ? [{ok:doc}]: doc)

    return {code:401}
  }
}

exports.view = {
  authorized(doc) {
    var accounts = doc.shipment._id.split('.')
    emit(accounts[0], {rev:doc._rev})
    emit(accounts[1], {rev:doc._rev})
  },

  history(doc) {
    for (var i in doc.history)
      emit(doc.history[i].transaction._id)
  },

  //used by drug endpoint to update transactions on drug name/form updates
  drugs(doc) {
    emit(doc.drug._id)
  },

  shipment(doc) {
    emit(doc.shipment._id)
  },

  record(doc) {
    if (doc.shipment._id.split('.').length == 1) return

    //TODO How to incorporate Complete/Verified/Destroyed, multiple map functions?  compound key e.g., [createAt, typeof verified] with grouping?
    emit(doc.createdAt)
  }
}

//Only sync inventory for now since transactions is just too big to sync locally
//Eventually maybe we have an optional request parameter to sync all transactions
exports.changes = function* () {
  //match timeout in dscsa-pouch
  this.req.setTimeout(20000)
  yield this.http(exports.filter.inventory(this.path), true)
}

exports.get = function* () {

  let selector = JSON.parse(this.query.selector)

  if (this.query.history)
    return this.body = yield history(this, selector._id)

  if (selector.createdAt && selector['shipment._id'].$ne) {
    this.req.setTimeout(10000)
    return yield this.http.get(exports.view.record(selector.createdAt.$gte, selector.createdAt.$lte), true)
  }

  if (selector['shipment._id'])
    return yield this.http.get(exports.view.shipment(selector['shipment._id']), true)

  if ( ! selector._id) return //TODO other search types

  yield this.http.get(exports.show.authorized(selector._id), true)

  //show function cannot handle _deleted docs with open_revs, so handle manually here
  if (this.status == 204 && this.query.open_revs)
    yield this.http.get(this.path+'/'+selector._id, true)
}

exports.bulk_get = function* (id) {
  this.status = 400
}

exports.post = function* () {

  let transaction = yield this.http.body

  defaults.call(this, transaction)

  //Making sure these are accurate and upto date is too
  //costly to do on every save so just do it on creation
  let drug = yield this.http.get(drugs.show.authorized(transaction.drug._id))
  yield drugs.updatePrice.call(this, drug)

  transaction.drug.price    = drug.price
  transaction.drug.brand    = drug.brand
  transaction.drug.generics = drug.generics
  transaction.drug.form     = drug.form

  let save = yield this.http.put('transaction/'+this.http.id).body(transaction)

  transaction._id  = save.id
  transaction._rev = save.rev
  this.body = transaction
}

exports.put = function* () {
  let transaction = yield this.http.body
  yield this.http('transaction/'+transaction._id, true).body(transaction)
}

exports.bulk_docs = function* () {
  yield this.http(null, true)
}

exports.delete = function* () {
  let doc = yield this.http.body
  let inv = yield this.http.get(exports.view.history(doc._id))

  if (inv[0]) //Only delete inventory if id is not in subsequent transaction
    this.throw(409, `Cannot delete this transaction because transaction ${inv[0]._id} has _id ${doc._id} in its history`)

  yield this.http('transaction/'+doc._id+'?rev='+doc._rev, true).body(doc)
}

exports.verified = {
  *post() {
    let doc = yield this.http.body
    let inv = yield this.http.get(exports.view.history(doc._id))

    //TODO We should make sure verifiedAt is saved as true for this transaction
    if (inv[0])
      this.throw(409, `Cannot verify this transaction because transaction ${inv[0]._id} with _id ${doc._id} already has this transaction in its history`)

    doc = yield patch.call(this, doc._id, {verifiedAt:new Date().toJSON()}) //Verify transaction and send back new _rev so user can continue to make edits

    //Create the new inventory item
    inv = defaults.call(this, {
      drug:doc.drug,
      verifiedAt:null,
      history:[{
        transaction:{_id:doc._id},
        qty:doc.qty.to || doc.qty.from
      }],
      qty:{
        to:null,
        from:doc.qty.to || doc.qty.from
      },
      exp:doc.exp && {
        to:null,
        from:doc.exp.to || doc.exp.from
      },
      lot:doc.lot && {
        to:null,
        from:doc.lot.to || doc.lot.from
      },
      rx:doc.rx && {
        to:null,
        from:doc.rx.to || doc.rx.from
      },
      location:doc.location
    })

    yield this.http.put('transaction/'+this.http.id).body(inv)
    this.body = doc
    //TODO rollback transaction verification if this creation fails
  },

  //This is a bit complex here are the steps:
  //1. Does this transaction id have a matching inventory item. No? Already un-verified
  //2. Can this inventory item be deleted. No? a subsequent transaction is based on this verification so it cannot be undone
  //3. Delete the item with inventory._id
  //4. Update the original transaction with verified_at = null
  *delete() {
    let doc = yield this.http.body
    let inv = yield this.http.get(exports.view.history(doc._id))
    inv = inv[0]

    if ( ! inv) //Only delete inventory if it actually exists
      this.throw(409, `Cannot unverify this transaction because no subsequent transaction with history containing ${doc._id} could be found`)

    if (inv.shipment._id != this.user.account._id)
      this.throw(409, `Cannot unverify this transaction because the subsequent transaction ${inv._id} has already been assigned to another shipment`)

    yield this.http.delete('transaction/'+inv._id+'?rev='+inv._rev).body(inv)
    this.body = yield patch.call(this, doc._id, {verifiedAt:null}) //Un-verify transaction and send back new _rev so user can continue to make edits
  }
}

function defaults(body) {
  //TODO ensure that there is a qty
  body.history    = body.history || []
  body.createdAt  = body.createdAt || new Date().toJSON()

  //TODO [TypeError: Cannot read property 'to' of undefined] is malformed request
  //Empty string -> null, string -> number, number -> number (including 0)
  body.qty.to     = body.qty.to != null && body.qty.to !== '' ? +body.qty.to : null     //don't turn null to 0 since it will get erased
  body.qty.from   = body.qty.from != null && body.qty.from !== '' ? +body.qty.from : null //don't turn null to 0 since it will get erased
  body.shipment   = body.shipment && body.shipment._id ? body.shipment : {_id:this.user.account._id}

  return body
}

/* Makeshift PATCH */
function *patch(id, updates) {

  let doc  = yield this.http.get(exports.show.authorized(id))
  let save = yield this.http.put('transaction/'+id).body(Object.assign(doc, updates))

  doc._rev = save.rev
  return doc
}

//TODO don't search for shipment if shipment._id doesn't have two periods (inventory)
//TODO option to include full from/to account information
function *history($this, id) {

  let result = []

  return yield history(id, result)

  function *history (_id, list) {
    let trans = yield $this.http.get('transaction/'+_id) //don't use show function because we might need to see transactions not directly authorized

    list.push(trans)

    let indentedList = [], len = trans.history.length

    if (len > 1) {
      trans.type = 'Repackaged'
      list.push([indentedList])
    }

    let all = trans.history.map(ancestor => {
      return history(ancestor.transaction._id, len == 1 ? list : indentedList)
    })
    //End Recursive

    //Now we just fill in full shipment and account info into the transaction
    if (trans.shipment._id == $this.account) { //skip if this transaction is in "inventory"
      trans.type = 'Inventory'
      all.unshift({
        account:{from:{_id:$this.account}}
      })
    } else {
      trans.type = 'Transaction'
      all.unshift(
        $this.http.get('shipment/'+trans.shipment._id)
      )
    }

    //Search for transaction's ancestors and shipment in parallel
    all = yield all //TODO this is co specific won't work when upgrading to async/await which need Promise.all

    trans.shipment = all[0]
    let account    = all[0].account

    //TODO this call is serial. Can we do in parallel with next async call?
    //TODO this is co specific won't work when upgrading to async/await which need Promise.all
    let accounts = yield [
      $this.http.get('account/'+account.from._id),
      account.to && $this.http.get('account/'+account.to._id)
    ]

    account.from = accounts[0]
    account.to   = accounts[1] //This is redundant (the next transactions from is the transactions to), but went with simplicity > speed
    return result
  }
}
