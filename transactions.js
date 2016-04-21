"use strict"

function history(id) {
  return `/transactions/_design/auth/_list/all/history?include_docs=true&key="${id}"`
}

/* Makeshift PATCH */
function *patch(id, updates) {
  let doc = yield this.couch.get().url('/transactions/'+id)

  for (let i in updates)
    doc.body[i] = updates[i]

  let res = yield this.couch.put().url('/transactions/'+id).body(doc.body)
  doc.body._rev = res.body.rev

  return doc.body
}

//TODO make this based on patch with {_delete:true}
function *remove(id) {
  var doc = yield this.couch.get().url('/transactions/'+id)

  yield this.couch.delete({proxy:true}).url(`/transactions/${id}?rev=${doc._rev}`)
}

exports.post = function* () {
  let res = yield this.couch.put()
  .url('/transactions/'+this.couch.id())
  .body(body => {
    //TODO ensure that there is a qty
    body.history    = body.history || []
    body.createdAt  = new Date().toJSON()
    body.verifiedAt = null

    //TODO [TypeError: Cannot read property 'to' of undefined] is malformed request
    body.qty.to     = +body.qty.to
    body.qty.from   = +body.qty.from
    body.shipment   = body.shipment || {_id:this.account}
    this.body       = body
  })
  this.status    = res.status

  if (this.status != 201)
    return this.body = res.body

  this.body._id  = res.body.id
  this.body._rev = res.body.rev
}

exports.delete = function* (id) {

  let inventory = yield this.couch.get().url(history(id))

  if (inventory[0]) { //Do not delete inventory if id is in subsequent transaction
    this.status  = 409
    this.message = `Cannot delete this transaction because transaction ${inventory[0]._id} has _id ${id} in its history`
    return
  }

  //We can safely delete this transaction.  Get the current _rev
  yield remove.call(this, id)
}

exports.history = function* (id) { //TODO option to include full from/to account information
  var count  = 0
  var $this  = this
  var result = []

  this.body = yield history(id, result)

  function history(_id, list) {
    return $this.couch.get().url('/transactions/'+_id)
    .then(trans => {

      if (trans.status == 404) {
        $this.status  = 404
        $this.message = 'Cannot find transaction '+_id
        return false
      }

      trans = trans.body
      //Start resursive
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
          $this.couch.get().url('/shipments/'+trans.shipment._id)
        )
      }

      //Search for transaction's ancestors and shipment in parallel
      return Promise.all(all).then(all => {

        if (all[0].status == 404) {
          $this.status  = 404
          $this.message = `Malformed transaction ${trans._id} does not have a shipment ${trans.shipment._id}`
          return false
        }

        trans.shipment = all[0].body

        //TODO this call is serial. Can we do in parallel with next async call?
        return Promise.all([
          $this.couch.get().url('/accounts/'+trans.shipment.account.from._id),
          trans.shipment.account.to && $this.couch.get().url('/accounts/'+trans.shipment.account.to._id)
        ])
      })
      .then(function(accounts) {
        if (accounts) {
          trans.shipment.account.from = accounts[0].body
          trans.shipment.account.to   = accounts[1].body //This is redundant (the next transactions from is the transactions to), but went with simplicity > speed
        }
        return result
      })
    })
  }
}

exports.verified = {
  *post(id) {
    let inventory = yield this.couch.get().url(history(id))

    if (inventory.body[0]) {
      this.status  = 409
      this.message = `Cannot verify this transaction because transaction ${inventory[0]._id} with _id ${id} already has this transaction in its history`
      return
    }

    let doc = yield patch.call(this, id, {verifiedAt:new Date().toJSON()})

    //TODO test if previous call was successful.

    //Create the inventory
    yield this.couch.put({proxy:true})
    .url('/transactions/'+this.couch.id())
    .body({
      shipment:{_id:this.account},
      drug:doc.drug,
      verifiedAt:null,
      history:[{
        transaction:{_id:id},
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
    let inventory = yield this.couch.get().url(history(id))

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
