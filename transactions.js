"use strict"
let drugs = require('./drugs')

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
  ensure('history').notNull.isArray
  ensure('history.transaction._id').notNull.regex(id)
  ensure('history.qty').notNull.isNumber
  ensure('drug._id').notNull.regex(/^\d{4}-\d{4}|\d{5}-\d{3}|\d{5}-\d{4}$/)
  ensure('drug.generics').notNull.isArray.length(1, 10)
  ensure('drug.generics.name').notNull.isString
  ensure('drug.generics.strength').notNull.isString
  ensure('drug.form').notNull.isString
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
      if (val[0] == userCtx.roles[0] && id.test(val[1])) return
      if (val[1] == userCtx.roles[0] && id.test(val[0])) return
      if (userCtx.roles[0] == "_admin") return
    }

    if(val.length == 1 && val[0] == userCtx.roles[0]) return

    return 'must be in the format <account.from._id> or <account.from._id>.<account.to._id>.<_id>'
  }
}

//Note ./startup.js saves views,filters,and shows as toString into couchdb and then replaces
//them with a function that takes a key and returns the couchdb url needed to call them.
exports.filter = {
  authorized(doc, req) {

    if (doc._id.slice(0, 7) == '_design') return

    var account = req.account || req.userCtx.roles[0]   //called from PUT or CouchDB
    var accounts = doc.shipment._id.split('.')
    return accounts[0] == account || accounts[1] == account
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
  }
}

exports.show = {
  authorized(doc, req) {
    if ( ! doc) return
    var account = req.account || req.userCtx.roles[0]   //called from PUT or CouchDB
    var accounts = doc.shipment._id.split('.')

    if (accounts[0] == account || accounts[1] == account)
      return toJSON([{ok:doc}])
  }
}

exports.changes = function* (db) {
  yield this.http(exports.filter.authorized(this.url), true)
}

exports.list = function* () {
  yield this.http(exports.view.authorized(), true)
}

exports.get = function* (id) {
  yield this.http(exports.show.authorized(id), true)
}

exports.bulk_get = function* (id) {
  this.status = 400
}

exports.post = function* () {

  let transaction = yield this.http.body

  defaults.call(this, transaction)
  //Making sure these are accurate and upto date is too
  //costly to do on every save so just do it on creation
  yield drugs.get.call(this, transaction.drug._id)
  transaction.drug.price    = this.body[0].ok.price
  transaction.drug.generics = this.body[0].ok.generics
  transaction.drug.form     = this.body[0].ok.form

  let create = yield this.http.put('transactions/'+this.http.id).body(transaction)

  this.status = create.status

  if (this.status != 201)
    return this.body = create.body

  this.body      = transaction
  this.body._id  = create.body.id
  this.body._rev = create.body.rev
}

exports.put = function* () {
  yield this.http(null, true)
}

exports.bulk_docs = function* () {
  yield this.http(null, true)
}

exports.delete = function* (id) {

  let inventory = yield this.http.get(exports.view.history(id))

  if (inventory[0]) { //Do not delete inventory if id is in subsequent transaction
    this.status  = 409
    this.message = `Cannot delete this transaction because transaction ${inventory[0]._id} has _id ${id} in its history`
    return
  }

  yield patch.call(this, id, {_delete:true}) //We can safely delete this transaction.  Get the current _rev
}


//TODO Convert this from promises to use async generators
exports.history = function* (id) { //TODO option to include full from/to account information
  var count  = 0
  var $this  = this
  var result = []

  this.body = yield history(id, result)

  function *history (_id, list) {
    let trans = yield $this.http.get('transactions/'+_id) //don't use show function because we might need to see transactions not directly authorized

    if (trans.status == 404) {
      $this.status  = 404
      $this.message = 'Cannot find transaction '+_id
      return false
    }

    trans = trans.body
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
        $this.http.get('shipments/'+trans.shipment._id)
      )
    }

    //Search for transaction's ancestors and shipment in parallel
    all = yield all //TODO this is co specific won't work when upgrading to async/await which need Promise.all

    if (all[0].status == 404) {
      $this.status  = 404
      $this.message = `Malformed transaction ${trans._id} does not have a shipment ${trans.shipment._id}`
      return result
    }

    trans.shipment = all[0].body
    let account = trans.shipment.account

    //TODO this call is serial. Can we do in parallel with next async call?
    //TODO this is co specific won't work when upgrading to async/await which need Promise.all
    let accounts = yield [
      $this.http.get('accounts/'+account.from._id),
      account.to && $this.http.get('accounts/'+account.to._id)
    ]
console.log('account', trans._id, account, accounts)
    account.from = accounts[0].body
    account.to   = accounts[1].body //This is redundant (the next transactions from is the transactions to), but went with simplicity > speed
    return result
  }
}

exports.verified = {
  *post(_id) {
    let inventory = yield this.http.get(exports.view.history(_id))

    if (inventory.body[0]) {
      this.status  = 409
      this.message = `Cannot verify this transaction because transaction ${inventory[0]._id} with _id ${_id} already has this transaction in its history`
      return
    }

    let doc = yield patch.call(this, _id, {verifiedAt:new Date().toJSON()})

    //TODO test if previous call was successful.
    inventory = defaults.call(this, {
      drug:doc.drug,
      verifiedAt:null,
      history:[{
        transaction:{_id},
        qty:doc.qty.to
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
      }
    })

    //Create the inventory
    yield this.http.put('transactions/'+this.http.id, true).body(inventory)

    //TODO rollback verified if the adding the new item is not successful
  },

  //This is a bit complex here are the steps:
  //1. Does this transaction id have a matching inventory item. No? Already un-verified
  //2. Can this inventory item be deleted. No? a subsequent transaction is based on this verification so it cannot be undone
  //3. Delete the item with inventory._id
  //4. Update the original transaction with verified_at = null
  *delete(id) {
    let inventory = yield this.http.get(exports.view.history(id))

    if ( ! inventory[0]) { //Only delete inventory if it actually exists
      this.status  = 409
      this.message = 'Cannot find a transaction with history.transaction = '+id+'.  Has this transaction been deleted already?'
      return
    }

    if (inventory[0].shipment._id != this.account) {
      this.status  = 409
      this.message = 'The inventory for this transaction has already been assigned to another shipment'
      return
    }

    yield patch.call(this, id, {verifiedAt:null}) //Un-verify transaction

    yield patch.call(this, inventory._id, {_delete:true})
  }
}

function defaults(body) {
  //TODO ensure that there is a qty
  body.history    = body.history || []
  body.createdAt  = body.createdAt || new Date().toJSON()

  //TODO [TypeError: Cannot read property 'to' of undefined] is malformed request
  body.qty.to     = body.qty.to ? +body.qty.to : null     //don't turn null to 0 since it will get erased
  body.qty.from   = body.qty.from ? +body.qty.from : null //don't turn null to 0 since it will get erased
  body.shipment   = body.shipment || {_id:this.account}

  return body
}

/* Makeshift PATCH */
function *patch(id, updates) {

  let doc = yield this.http(exports.show.authorized(id))
  let body = doc.body[0].ok

  if (doc.status != 200) return
  Object.assign(body, updates)
  let patch = yield this.http.put('transactions/'+id).body(body)
  body._rev = patch.body.rev

  return body
}
