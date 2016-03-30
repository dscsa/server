"use strict"

function history(id) {
  return `/transactions/_design/auth/_list/all/history?include_docs=true&key="${id}"`
}

/* Makeshift PATCH */
function *patch(id, updates) {
  let doc = yield this.couch.get().url('/transactions/'+id)

  for (let i in updates)
    doc[i] = updates[i]

  yield this.couch.put().url('/transactions/'+id).body(doc)
}

//TODO make this based on patch with {_delete:true}
function *remove(id) {
  var doc = yield this.couch.get().url('/transactions/'+id)

  yield this.couch.delete({proxy:true}).url(`/transactions/${id}?rev=${doc._rev}`)
}

exports.post = function* () {
  yield this.couch.put({proxy:true})
  .url('/transactions/'+this.couch.id())
  .body(body => {
    //TODO ensure that there is a qty
    body.history    = body.history || []
    body.createdAt  = new Date().toJSON()
    body.verifiedAt = null
    body.qty.to     = +body.qty.to
    body.qty.from   = +body.qty.from
    body.shipment   = body.shipment || {_id:this.account}
  })
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

      if ( ! trans.body) {
        this.status  = 404
        this.message = 'Cannot find transaction '+_id
        return false
      }

      //Start resursive
      list.push(trans)

      let len = trans.history.length

      if (len == 1)    //This is just a normal transfer
        history(trans.history[0].transaction._id, list)
      else if (len > 1) {
        trans.type = 'Repackaged'
        let indent = []
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
        transaction.type = 'Transaction'
        all.unshift(
          $this.couch.get().url('/shipments/'+trans.shipment._id)
        )
      }

      //Search for transaction's ancestors and shipment in parallel
      return Promose.all(all).then(all => {
        trans.shipment = all[0]

        //TODO this call is serial. Can we do in parallel with next async call?
        return Promise.all([
          $this.couch.get().url('/accounts/'+trans.shipment.account.from._id),
          trans.shipment.account.to && $this.couch.get().url('/accounts/'+trans.shipment.account.to._id)
        ])
      })
      .then(function(accounts) {
        trans.shipment.account.from = accounts[0]
        trans.shipment.account.to   = accounts[1] //This is redundant (the next transactions from is the transactions to), but went with simplicity > speed
        return result
      })
    })
  }
}

exports.verified = {
  *post(id) {
    let inventory = yield this.couch.get().url(history(id))

    if (inventory[0]) {
      this.status  = 409
      this.message = `Cannot verify this transaction because transaction ${inventory[0]._id} with _id ${id} already has this transaction in its history`
      return
    }

    yield patch.call(this, id, {verifiedAt:new Date().toJSON()})

    //TODO test if previous call was successful

    //Create the inventory
    yield this.couch.put({proxy:true})
    .url('/transactions/'+couch.id())
    .body({
      shipment:{_id:this.account},
      verifiedAt:null,
      history:[{
        transaction:{_id:id},
        qty:doc.body.qty.to
      }],
      qty:{
        to:null,
        from:doc.body.qty.to || doc.body.qty.from
      },
      exp:doc.body.exp && {
        to:null,
        from:doc.body.exp.to || doc.body.exp.from
      },
      exp:doc.body.lot && {
        to:null,
        from:doc.body.lot.to || doc.body.lot.from
      }
    })
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
