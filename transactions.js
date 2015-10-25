var couch = require('./couch')

exports.list = couch.list
exports.doc  = couch.doc
exports.post = function* (prior) {
  yield couch(this, 'PUT')
  .path('/transactions/'+couch.id())
  .body({
    history:prior.transaction ? [prior] : [],  //if called from koa-route, prior is empty object {}
    created_at:new Date().toJSON(),
    shipment:this.cookies.get('AuthAccount')
  }, false)
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
      return couch(that, 'GET')
      .path('/shipments/'+transaction.shipment)
      .proxy(false)
      .then(function(shipment) {

        if (shipment.error) { //skip if this transaction is in "inventory"
          console.log('this transaction is in inventory', transaction)
          transaction.text = 'Inventory of '+(transaction.qty.from || '?')+' units'
        }
        else {
          //console.log('shipment', shipment)
          transaction.shipment = shipment
          transaction.text =
            shipment.from.name+
            ' transferred '+
            (transaction.qty.to || transaction.qty.from || '?')+
            ' units '+
            //'to '+shipment.to.name+' '+
            (transaction.captured_at ? 'on '+transaction.captured_at : '')
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
exports.captured = {
  *post(id) {
    this.path = path
    var inventory = yield couch(this, 'GET')
    .path(id, true)
    .proxy(false)
    inventory = inventory[0]

    if (inventory) {
      this.status  = 409
      this.message = 'Cannot accept because a dependent transaction already exists '+inventory._id
    } else {
      /*Start makeshift PATCH */
      var doc = yield couch(this, 'GET')
      .path('/transactions/'+id)
      .proxy(false)

      //Update current transaction to be captured
      doc.captured_at = new Date().toJSON()

      this.req.body = yield couch(this, 'PUT')
      .path('/transactions/'+id)
      .body(doc)
      .proxy(false)
      /*End makeshift PATCH */

      //Add a new transaction to inventory
      yield exports.post.call(this, {
        transaction:id,
        qty:this.req.body.qty.to || null
      })
    }
  },

  *delete(id) {
    this.path = path
    var inventory = yield couch(this, 'GET')
    .path(id, true)
    .proxy(false)
    inventory = inventory[0]

    if ( ! inventory) {
      this.status  = 409
      this.message = 'The item with _id '+id+' may have already been deleted'
    } else { //Only delete inventory if it actually exists
      /*Start makeshift PATCH */
      var doc = yield couch(this, 'GET')
      .path(inventory._id, true)
      .proxy(false)
      doc = doc[0]

      if (doc) {
        this.status  = 409
        this.message = 'Cannot un-capture because a dependent transaction exists '+doc._id
      } else { //Only delete inventory if not in subsequent transaction
        //Update current transaction to be un-captured
        doc.captured_at = null

        yield couch(this, 'PUT')
        .path('/transactions/'+id)
        .body(doc)
        .proxy(false)

        yield couch(this, 'DELETE')
        .path('/transactions/'+inventory._id+'?rev='+inventory._rev)
      }
    }
  }
}
