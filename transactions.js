var couch = require('./couch')

exports.list = couch.list
exports.doc  = couch.doc
exports.post = function* () {
  yield couch(this, 'PUT')
  .path('/transactions/'+couch.id())
  .body({
    history:[],
    verified_at:null,
    created_at:new Date().toJSON(),
    shipment:this.cookies.get('AuthAccount')
  }, false)
}
exports.delete = function* (id) {
  //TODO move this to a general delete function.  Transaction should
  //not be able to be deleted if a latter transaction has it in history
  var inventory = yield couch(this, 'GET')
  .path(path.replace(':id', id))
  .proxy(false)
  inventory = inventory[0]

  if (inventory) { //Do not delete inventory if id is in subsequent transaction
    this.status  = 409
    this.message = 'Cannot delete this transaction because another transaction has _id '+id+' in its history'
  } else { //We can safely delete this transaction
    var doc = yield couch(this, 'GET')
    .path('/transactions/'+id)
    .proxy(false)

    yield couch(this, 'DELETE')
    .path('/transactions/'+id+'?rev='+doc._rev)
  }
}

exports.history = function* (id) { //TODO option to include full from/to account information
  var count = 0
  var that = this
  var result = []

  this.body = yield history(id, result)

  function history(_id, list) {
    return couch(that, 'GET')
    .path('/transactions/'+_id)
    .proxy(false)
    .then(function(transaction) {

      if ( ! transaction) {
        this.status  = 404
        this.message = 'Cannot find transaction '+_id
        return false
      }

      return couch(that, 'GET')
      .path('/shipments/'+transaction.shipment)
      .proxy(false)
      .then(function(shipment) {

        if (shipment.error) { //skip if this transaction is in "inventory"
          transaction.text = 'Inventory of '+(transaction.qty.from || '?')+' units'
        } else {
          //console.log('shipment', shipment)
          transaction.shipment = shipment
          transaction.text =
            shipment.from.name+
            ' transferred '+
            (transaction.qty.to || transaction.qty.from || '?')+
            ' units '+
            //'to '+shipment.to.name+' '+
            (transaction.captured_at ? 'on '+transaction.captured_at.slice(0, 10) : '')
          //console.log(transaction)
        }

        list.push(transaction)

        var len = transaction.history.length

        if (len == 1)    //This is just a normal transfer
          return history(transaction.history[0].transaction, list)

        if (len > 1) {   //If length > 1 then its repackaged
          transaction.text = 'Repackaged '+len+' items with '+transaction.history.map(function(t){
            return (t.qty || '?')+' from '+t.transaction
          })
          var indent = []
          list.push(indent)

          return Promise.all(transaction.history.map(function(transaction) {
            var next = []
            indent.push(next)
            return history(transaction.transaction, next)
          }))
        }
      })
      .then(function(_) {
        return result
      })
    })
  }
}

var path = '/transactions/_design/auth/_list/all/history?include_docs=true&key=":id"'
exports.verified = {
  *post(id) {
    this.path = path
    var inventory = yield couch(this, 'GET')
    .path(path.replace(':id', id))
    .proxy(false)
    inventory = inventory[0]

    if (inventory) {
      this.status  = 409
      this.message = 'Cannot verify this transaction because another transaction with _id '+inventory._id+' already has this transaction in its history'
      return
    }

    /*Start makeshift PATCH */
    var doc = yield couch(this, 'GET')
    .path('/transactions/'+id)
    .proxy(false)

    if (doc.qty.to == null || doc.qty.to == '') {
      this.status  = 409
      this.message = 'Cannot capture a transaction with unknown quantity'
      return
    }
    //Update current transaction to be captured
    doc.captured_at = new Date().toJSON()

    this.req.body = yield couch(this, 'PUT')
    .path('/transactions/'+id)
    .body(doc)
    .proxy(false)
    /*End makeshift PATCH */

    //New transaction should be un-captured
    this.req.body.shipment    = null
    this.req.body.captured_at = null
    this.req.body.history     = [{
      transaction:id,
      qty:this.req.body.qty.to
    }]
    this.req.body.qty         = {
      to:null,
      from:this.req.body.qty.to
    }
    //Add a new transaction to inventory
    yield exports.post.call(this)
  },

  //This is a bit complex here are the steps:
  //1. Does this transaction id have a matching inventory item. No? Already un-captured
  //2. Can this inventory item be deleted. No? a subsequent transaction is based on this capture so it cannot be undone
  //3. Delete the item with inventory._id
  //4. Update the original transaction with capture_at = null
  *delete(id) {
    var inventory = yield couch(this, 'GET')
    .path(path.replace(':id', id))
    .proxy(false)
    inventory = inventory[0]

    if ( ! inventory) { //Only delete inventory if it actually exists
      this.status  = 409
      this.message = 'Cannot find a transaction with history.transaction = '+id+'.  Has this transaction been deleted already?'
      return
    }

    if (inventory.shipment != this.cookies.get('AuthAccount')) {
      this.status  = 409
      this.message = 'The inventory for this transaction has already been assigned to another shipment'
      return
    }

    yield exports.delete.call(this, inventory._id)
    if (this.status != 200) return

    /*Start makeshift PATCH */
    var doc = yield couch(this, 'GET')
    .path('/transactions/'+id)
    .proxy(false)

    //Update current transaction to be captured
    doc.captured_at = null

    this.req.body = yield couch(this, 'PUT')
    .path('/transactions/'+id)
    .body(doc)
    .proxy(false)
    /*End makeshift PATCH */
  }
}
