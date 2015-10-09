var couch = require('./couch')

exports.list = couch.list
exports.doc  = couch.doc
exports.post = function* (prior) {
  yield couch(this, 'PUT')
  .path('/'+couch.id(), true)
  .body({
    //history:prior.transaction ? [prior] : [],  //if called from koa-route, prior is empty object {}
    created_at:new Date().toJSON(),
    shipment:this.cookies.get('AuthAccount')
  }, false)
  console.log('body3')
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
    var inventory = yield couch(this, 'GET')
    .path(path.replace(":id", id))
    .proxy(false)

    inventory = inventory[0]

    if (inventory) {
      this.status  = 409
      this.message = 'Cannot accept because a dependent transaction already exists '+inventory._id
    }
    else {
      this.path = '/transactions/'+id
      this.req.body = yield couch.patch.call(this,
        {captured_at:new Date().toJSON()}
      )
      yield exports.post.call(this, {
        transaction:id,
        qty:this.req.body.qty.to || null
      })
    }
  },

  *delete(id) {
    var inventory = yield couch(this, 'GET')
    .path(path.replace(":id", id))
    .proxy(false)

    inventory = inventory[0]

    if ( ! inventory) {
      this.status  = 409
      this.message = 'The item with _id '+id+' may have already been deleted'
    }
    else { //Only delete inventory if it actually exists
      var subsequent = yield couch(this, 'GET')
      .path(path.replace(":id", inventory._id))
      .proxy(false)

      subsequent = subsequent[0]

      if (subsequent) {
        this.status  = 409
        this.message = 'Cannot unaccept because a dependent transaction exists '+subsequent._id
      }
      else { //Only delete inventory if not in subsequent transaction
        this.path = '/transactions/'+id
        couch.patch.call(this, {captured_at:null})
        yield couch(this, 'DELETE')
        .path('/transactions/'+inventory._id+'?rev='+inventory._rev)
      }
    }
  }
}
