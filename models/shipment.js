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
  },

  'account.to._id':{
    map(doc) {
      emit([doc.account.to._id, doc.updatedAt.slice(0,4)],[1])
    },
    reduce:'_stats'

  }
}

exports.get_csv = async function (ctx, db) {
  const opts = {startkey:ctx.account._id, endkey:ctx.account._id+'\uffff', include_docs:true}
  let view = await ctx.db.shipment.allDocs(opts)
  ctx.body = csv.fromJSON(view.rows, ctx.query.fields)
  ctx.type = 'text/csv'
}

//Server-side validation methods to supplement shared ones.
exports.validate = function(model) {
  return model.ensure('_id').custom(authorized).withMessage('You are not authorized to modify this shipment')
}

//Context-specific - options MUST have 'ctx' property in order to work.
function authorized(doc, opts) {
  var id = doc._id.split(".")
  return id[0] == opts.ctx.account._id || id[2] == opts.ctx.account._id
}
