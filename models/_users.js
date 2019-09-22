"use strict"

//TODO consider putting account's State as user role
exports.validate = function(model) {
  return model
   .ensure('_id').set(doc => 'org.couchdb.user:'+doc.name)
   .ensure('name').required().pattern(/^\d{10}$|^\d{10}\.\d{10}$/) //user_id.account_id
   .ensure('type').set(doc => 'user')
   .ensure('roles').typeArray().minLength(2).maxLength(2) //allAccounts, and account._id
}
