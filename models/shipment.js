"use strict"
//defaults
module.exports = exports = Object.create(require('../helpers/model'))

let csv = require('csv/server')

//Shipments
exports.views = {
  tracking(doc) {
    emit(doc.tracking)
  },

  'account.from._id':function(doc) {
    emit(doc.account.from._id)
  }
}

exports.get_csv = function*(db) {
  const opts = {startkey:this.account._id, endkey:this.account._id+'\uffff', include_docs:true}
  let view = yield this.db.shipment.allDocs(opts)
  this.body = csv.fromJSON(view.rows)
  this.type = 'text/csv'
}

//Server-side validation methods to supplement shared ones.
exports.validate = function(model) {
  return model.ensure('_id').custom(authorized).withMessage('You are not authorized to modify this shipment')
}

//Context-specific - options MUST have 'this' property in order to work.
function authorized(doc) {
  var id = doc._id.split(".")
  return id[0] == this.account._id || id[2] == this.account._id
}
