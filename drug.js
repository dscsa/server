"use strict"
//defaults
module.exports = exports = Object.create(require('./model'))

let crypto = require('crypto')
let admin  = {ajax:{auth:require('../../keys/dev.js')}}

//Drugs
exports.views = {
  'generics.name':function(doc) {
    for (var i in doc.generics) {
      if ( ! doc.generics[i].name)
        log('drug generic map error for', doc)

      emit(doc.generics[i].name.toLowerCase())
    }
  },

  ndc9(doc) {
    emit(doc.ndc9)
  },

  upc(doc) {
    emit(doc.upc)
  }
}

//Server-side validation methods to supplement shared ones.
exports.validate = function(model) {
  return model.ensure('_rev').custom(updateTransactions).withMessage('Could not update transactions containing this drug')
}

//Context-specific - options MUST have 'this' property in order to work.
//Get all transactins using this drug so we can update denormalized database
function updateTransactions(doc, rev) {
  return rev[0] == 1 || this.db.transaction.query('drug._id')
  .then(transactions => {
    return Promise.all(transactions.rows.map(transaction => {
      if(
          transaction.drug.generic == drug.generic &&
          transaction.drug.form == drug.form &&
          transaction.drug.brand == drug.brand &&
          transaction.drug.price
        )
        return

      transaction.drug.generics = drug.generics
      transaction.drug.form     = drug.form
      transaction.drug.brand    = drug.brand
      transaction.drug.generic  = drug.generic

      if ( ! transaction.drug.price)
        transaction.drug.price = drug.price

      //TODO _bulk_docs update would be faster (or at least catch errors with Promise.all)
      this.db.transaction.put(transaction, admin)
    }))
  })
}
