"use strict"

let drugs = require('./drugs')

exports.validate_doc_update = function(newDoc, oldDoc, userCtx) {

  // if ( ! userCtx.roles[0])
  //   throw({unauthorized:'You must be logged in to create or modify a transaction'})

  if (newDoc._id.slice(0, 7) == '_local/')
    return

  if ( ! newDoc.shipment || ! newDoc.shipment._id)
    throw({forbidden:'transaction.shipment must be an object with an _id. Got '+toJSON(newDoc)})

  if ( ! isArray(newDoc.history))
    throw({forbidden:'transaction.history must be an array. Got '+toJSON(newDoc)})

  if ( ! newDoc.drug || ! newDoc.drug._id || ! isArray(newDoc.drug.generics) || ! newDoc.drug.form)
    throw({forbidden:'transaction.drug must be an object with an _id, generics, and form. Got '+toJSON(newDoc)})

  var ids = newDoc.shipment._id.split('.')

  // if (ids.length != 3 && (newDoc.shipment._id != userCtx.roles[0]))
  //   throw({forbidden:'transaction.shipment._id '+newDoc.shipment._id+' must be either your account._id '+toJSON(userCtx.roles[0])+' or in the format <from account._id>.<to account._id>.<unique id>.'})

  // if (ids[0] != userCtx.roles[0] && ids[1] != userCtx.roles[0])
  //   throw({unauthorized:'An account may only add transactions to a shipment to or from itself. Got '+toJSON(userCtx)});
}


//WHEN IS IT CALLED
//ALL PARAMS - TYPES, REQUIREMENTS
//RETURN VALUE
//SET CONTEXT
//ANY SIDE EFFECTS
//ANY TODOS/ISSUES



function defaults(body) {
  //TODO ensure that there is a qty
  body.history    = body.history || []
  body.createdAt  = body.createdAt || new Date().toJSON()

  //TODO [TypeError: Cannot read property 'to' of undefined] is malformed request
  body.qty.to     = +body.qty.to
  body.qty.from   = +body.qty.from
  body.shipment   = (body.shipment && body.shipment._id) || {_id:this.account}
}

/* Makeshift PATCH */
function *patch(id, updates) {
  let transaction = yield this.http.get('transactions/'+id)
  transaction     = transaction.body

  Object.assign(transaction, updates)

  let res = yield this.http.put('transactions/'+id).body(transaction)

  transaction._rev = res.body.rev

  return transaction
}

//TODO make this based on patch with {_delete:true}
function *remove(id) {
  var doc = yield this.http.get('transactions/'+id)
  yield this.http.delete(`/transactions/${id}?rev=${doc._rev}`, true)
}

exports.post = function* () {

  let transaction = yield this.http.body

  defaults.call(this, transaction)

  //Making sure these are accurate and upto date is too
  //costly to do on every save so just do it on creation
  yield drugs.get.call(this, transaction.drug._id)

  transaction.drug.price    = this.body.price
  transaction.drug.generics = this.body.generics
  transaction.drug.form     = this.body.form

  let create = yield this.http.put('transactions/'+this.http.id).body(transaction)

  this.status = create.status

  if (this.status != 201)
    return this.body = create.body

  this.body      = transaction
  this.body._id  = create.body.id
  this.body._rev = create.body.rev
}

exports.bulk_docs = function* () {

  let body = yield this.http.body

  for (let doc of body.docs) {
    if ( ! doc._id.includes('_local/'))
      defaults.call(this, doc)
  }

  yield this.http(null, true).body(body)
}

exports.delete = function* (id) {

  let inventory = yield this.http.get(history(id))

  if (inventory[0]) { //Do not delete inventory if id is in subsequent transaction
    this.status  = 409
    this.message = `Cannot delete this transaction because transaction ${inventory[0]._id} has _id ${id} in its history`
    return
  }

  yield remove.call(this, id) //We can safely delete this transaction.  Get the current _rev
}


//TODO Convert this from promises to use async generators
exports.history = function* (id) { //TODO option to include full from/to account information
  var count  = 0
  var $this  = this
  var result = []

  this.body = yield history(id, result)

  function *history (_id, list) {
    let trans = yield $this.http.get('transactions/'+_id)

    if (trans.status == 404) {
      $this.status  = 404
      $this.message = 'Cannot find transaction '+_id
      return false
    }

    trans = trans.body
    list.push(trans)

    let indent, len = trans.history.length

    if (len == 1)    //This is just a normal transfer
      history(trans.history[0].transaction._id, list)
    else if (len > 1) {
      trans.type = 'Repackaged'
      indent = []
      list.push(indent)
    }

    let all = trans.history.map(ancestor => {
      var next = []
      indent.push(next)
      return history(ancestor.transaction._id, next)
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
    all = yield Promise.all(all)

    if (all[0].status == 404) {
      $this.status  = 404
      $this.message = `Malformed transaction ${trans._id} does not have a shipment ${trans.shipment._id}`
      return result
    }

    trans.shipment = all[0].body
    let account = trans.shipment.account

    //TODO this call is serial. Can we do in parallel with next async call?
    let accounts = yield Promise.all([
      $this.http.get('accounts/'+account.from._id),
      account.to && $this.http.get('accounts/'+account.to._id)
    ])

    account.from = accounts[0].body
    account.to   = accounts[1].body //This is redundant (the next transactions from is the transactions to), but went with simplicity > speed
    return result
  }
}

exports.verified = {
  *post(_id) {
    let inventory = yield this.http.get(history(_id))

    if (inventory.body[0]) {
      this.status  = 409
      this.message = `Cannot verify this transaction because transaction ${inventory[0]._id} with _id ${_id} already has this transaction in its history`
      return
    }

    let doc = yield patch.call(this, _id, {verifiedAt:new Date().toJSON()})

    //TODO test if previous call was successful.

    //Create the inventory
    yield this.http.put('transactions/'+this.http.id, true).body({
      shipment:{_id:this.account},
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

    //TODO rollback verified if the adding the new item is not successful
  },

  //This is a bit complex here are the steps:
  //1. Does this transaction id have a matching inventory item. No? Already un-verified
  //2. Can this inventory item be deleted. No? a subsequent transaction is based on this verification so it cannot be undone
  //3. Delete the item with inventory._id
  //4. Update the original transaction with verified_at = null
  *delete(id) {
    let inventory = yield this.http.get(history(id))

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

    yield remove.call(this, inventory._id)
  }
}
