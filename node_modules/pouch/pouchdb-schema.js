if (typeof module == 'object') module.exports = pouchSchema

function pouchSchema(pouchModel, microSecond, methods = {}) {

  //Common schema used by both drug and transaction dbs
  let drug = pouchModel()
    .ensure('form').required().typeString().pattern(/([A-Z][a-z]+\s?)+\b/)
    .ensure('generic').set(generic)
    .ensure('generics').required().typeArray().minLength(1).maxLength(10)
    .ensure('generics.name').required().typeString().pattern(/([A-Z][0-9a-z]*\s?)+\b/)
    .ensure('generics.strength').typeString().pattern(/^[0-9][0-9a-z/.]+$/)
    .ensure('price').default(doc => Object()).typeObject()
    .ensure('price.invalidAt').typeDate()
    .ensure('price.goodrx').typeNumber()
    .ensure('price.nadac').typeNumber()
    .ensure('price.retail').typeNumber()
    .ensure('brand').typeString().maxLength(20)
    .ensure('gsns').pattern(/^\d{1,5}(,\d{1,5})*$/)
    .ensure('pkg').typeString().minLength(1).maxLength(2)

  //db specific schema
  let db = {

    drug:pouchModel()
      .ensure().rules(drug)
      .ensure('_id').required().pattern(/\d{4}-\d{4}|\d{5}-\d{3}|\d{5}-\d{4}|\d{5}-\d{5}/)
      .ensure('upc').set(doc => doc._id.replace('-', ''))
      .ensure('ndc9').set(ndc9)
      .ensure('labeler').typeString().maxLength(40)
      .ensure('warning').typeString()
      .ensure('updatedAt').set(_ => new Date().toJSON())
      .ensure('createdAt').default(_ => new Date().toJSON())
      .methods(methods.drug),

    user:pouchModel()
      .ensure('_id').set(doc => doc.phone.replace(/[^\d]/g, '')+'.'+doc.account._id.replace(/[^\d]/g, '')).typeTel()
      .ensure('phone').required().typeTel()
      .ensure('account._id').required().typeTel()
      .ensure('email').required().typeEmail()
      .ensure('name.first').required().typeString()
      .ensure('name.last').required().typeString()
      .ensure('updatedAt').set(_ => new Date().toJSON())
      .ensure('createdAt').default(_ => new Date().toJSON())
      .methods(methods.user),

    shipment:pouchModel()
      .ensure('_id').default(doc => doc.account.to._id+'.'+new Date().toJSON().slice(0, -5)+'.'+doc.account.from._id).typeString()
      .ensure('account.to.name').required().typeString()
      .ensure('account.to._id').required().typeTel()
      .ensure('account.from.name').required().typeString()
      .ensure('account.from._id').required().typeTel()
      .ensure('tracking').required().minLength(6)
      .ensure('updatedAt').set(_ => new Date().toJSON())
      .methods(methods.shipment),

    transaction:pouchModel()
      .ensure('_deleted')
        .custom(doc => ! doc.next.length)
        .withMessage('cannot delete because this transaction has references within its "next" property')
      .ensure('_id').default(transactionId).typeString()
      .ensure('drug').rules(drug)
      .ensure('drug._id').required().pattern(/Unspecified|\d{4}-\d{4}|\d{5}-\d{3}|\d{5}-\d{4}|\d{5}-\d{5}/)
      .ensure('user._id').required().pattern(/^\d{10}$|^\d{10}\.\d{10}$/)
      .ensure('shipment._id').required()
        .pattern(/^\d{10}$|^\d{10}\.\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{10}$/)
        .withMessage('must be a string in the format "account.from._id" or "account.from._id"."account.to._id"."new Date().toJSON()"')
      .ensure('verifiedAt').typeDateTime()
        .custom(doc => doc.qty.from || doc.qty.to).withMessage('cannot be set unless qty.from or qty.to is set')
        .custom(doc => doc.exp.from || doc.exp.to).withMessage('cannot be set unless exp.from or exp.to is set')
      .ensure('next').custom(properNextArray).withMessage('Next array is improperly formatted')
      .ensure('qty').default(doc => Object()).typeObject()
      .ensure('qty.from').typeNumber().min(0).max(3000)
      .ensure('qty.to').typeNumber().min(0).max(3000)
      .ensure('exp').default(doc => Object()).typeObject()
      .ensure('exp.from')
        .typeDateTime()
        .pattern(/^20[12]/) //We were getting malformed dates like 0201-06
      .ensure('exp.to')
        .typeDateTime()
        .pattern(/^20[12]/) //We were getting malformed dates like 0201-06
      .ensure('bin')
        .pattern(/[A-Za-z][0-6]?\d{2}/)
        .custom(doc => /[A-Z]\d{2}/.test(doc.bin) || doc.verifiedAt).withMessage('a nonrepack bin can only be set when verifiedAt is set')
      .ensure('updatedAt').set(_ => new Date().toJSON())
      .methods(methods.transaction),

    account:pouchModel()
      .ensure('_id').set(doc => doc.phone.replace(/[^\d]/g, '')).typeTel()
      .ensure('phone').required().typeTel()
      .ensure('name').required().typeString()
      .ensure('license').required().typeString()
      .ensure('street').required().typeString()
      .ensure('city').required().typeString()
      .ensure('state').required().typeString().minLength(2).maxLength(2)
      .ensure('zip').required().pattern(/\d{5}/)
      .ensure('authorized').default(doc => []).typeArray()
      .ensure('ordered').default(doc => Object()).typeObject()
      .ensure('updatedAt').set(_ => new Date().toJSON())
      .ensure('createdAt').default(_ => new Date().toJSON())
      .methods(methods.account)
  }

  return db

  function ndc9(drug) {
    let [labeler, product] = drug._id.split('-')
    //Some OTCs need all 10 digits of their UPC, which means all 11 digits of an NDC9.
    //Saving them in DB in the 5-5 format, should derive an NDC9 here as 5-'0'5
    return ('00000'+labeler).slice(-5)+('00000'+product).slice(product.length > 4 ? -6 : -4)
  }

  function properNextArray(doc){
    return true ////TODO: come back to this function later on, currently the UI forces format, and there's too much already being tested 04/2020

    let next = doc.next

    if(next.length == 0) return true

    if((next[0].picked) && (next[0].picked._id)){
      return true
      //return /[s|S|r|R|b|B|g|G][0-9]{2,3}/.test(next[0].picked.basket)
    }

    //TODO: check other fields
    return true
  }

  function generic(doc) {
    let drug = doc.drug || doc //used in both transaction.drug and drug
    let name = drug.generics.map(concat).join(', ')+' '+drug.form

    name = name.replace(/ tablet| capsule/i, '')  //TODO: how to properly depracate? bc they're not the same thing

    return name

    function concat(generic) {
      return generic.name + (generic.strength && (" "+generic.strength))
    }
  }

  function transactionId() {
    return new Date().toJSON().replace('Z', microSecond()+'Z')
  }
}
