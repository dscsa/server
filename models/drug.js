"use strict"
//defaults
module.exports = exports = Object.create(require('../helpers/model'))

let crypto = require('crypto')
let csv = require('csv/server')
let admin  = {ajax:{auth:require('../../../keys/dev.js')}}

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

exports.get_csv = function*(db) {
  let view = yield this.db.drug.allDocs({endkey:'_design', include_docs:true})
  this.body = csv.fromJSON(view.rows)
  this.type = 'text/csv'
}

//Server-side validation methods to supplement shared ones.
exports.validate = function(model) {
  return model.ensure('_rev').custom(updateTransactions).withMessage('Could not update transactions containing this drug')
}

//Context-specific - options MUST have 'this' property in order to work.
//Get all transactins using this drug so we can update denormalized database
function updateTransactions(drug, rev) {
  return rev.split('-')[0] == 1 || this.db.transaction.query('drug._id', {key:[this.account._id, drug._id], include_docs:true})
  .then(transactions => {
    //console.log('updateTransactions', transactions)
    return Promise.all(transactions.rows.map(row => {
      let transaction = row.doc
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

      //console.log('updateTransaction', transaction)
      //TODO _bulk_docs update would be faster (or at least catch errors with Promise.all)
      return this.db.transaction.put(transaction, {this:this, ajax:admin.ajax})
    }))
  })
  .then(puts => {
    console.log(`updated ${puts.length} transactions to have drug name ${drug.generic}`) //err.errors['shipment._id'].rules
    return true //make sure validation passes
  })
  .catch(err => {
    console.log('updateTransactions err', err.errors) //err.errors['shipment._id'].rules
  })
}
