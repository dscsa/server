"use strict"
//defaults
module.exports = exports = Object.create(require('./model'))

//Shipments
exports.views = {
  tracking(doc) {
    emit(doc.tracking)
  },

  'account.to._id':function(doc) {
    emit(doc.account.to._id)
  },

  'account.from._id':function(doc) {
    emit(doc.account.from._id)
  }
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
