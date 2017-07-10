"use strict"
//defaults
module.exports = exports = Object.create(require('../helpers/model'))

exports.views = {
  //Use _bulk_get here instead? Not supported in 1.6
  //this.db.account.get({_id:{$gt:null, $in:accounts[0].authorized}}),
  authorized(doc) {
    for (var i in doc.authorized) {
      emit(doc.authorized[i])
    }
  },

  state(doc) {
    emit(doc.state)
  }
}

//Shows everything in inventory AND all ordered items not in inventory
exports.inventory = function* (id) { //account._id will not be set because google does not send cookie
  const [inventory, account] = yield [
    this.db.transaction.query('inventory', opts(2, id)),
    this.db.account.get(id)
  ]

  //Match inventory with ordered when applicable
  let rows = inventory.rows.map(row => {
    let generic = row.key[1]

    if (account.ordered[generic]) {
      row.value.ordered = true
      row.value.order = account.ordered[generic]
      delete account.ordered[generic]
    }

    return row
  })

  //Add unmatched orders to the end of array
  for (let generic in account.ordered)
    rows.push({key:[id, generic], value:{ordered:true, order:account.ordered[generic]}})

  this.body = view2csv({rows}, ["group","bins","repack","pending","ordered","order.maxInventory", "order.minQty", "order.minDays","order.verifiedMessage","order.destroyedMessage", "order.defaultBin","order.price30","order.price90","order.vialQty","order.vialSize"])
}

exports.count = function* (id) { //account._id will not be set because google does not send cookie
  const view = yield this.db.transaction.query('count', opts(this.query.group_level, id))
  this.body  = view2csv(view)
}

exports.qty = function* (id) { //account._id will not be set because google does not send cookie
  const view = yield this.db.transaction.query('qty', opts(this.query.group_level, id))
  this.body  = view2csv(view)
}

exports.value = function* (id) { //account._id will not be set because google does not send cookie
  const view = yield this.db.transaction.query('value', opts(this.query.group_level, id))
  this.body  = view2csv(view)
}

exports.record = function* (id) { //account._id will not be set because google does not send cookie
  const view = yield this.db.transaction.query('record', opts(this.query.group_level, id))
  this.body  = view2csv(view)
}

function opts(group_level, id) {
   return {group_level:group_level || 1, startkey:[id], endkey:[id, {}]}
}

//If worried about headers being dynamic you can optional pass array
function view2csv(view, fixedHeader) {

  let rows = []
  //Collect and get union of all row headers
  const header = view.rows.reduce((header, row) => {
    row.value.group = row.key.slice(1)

    let flat = nested2flat(row.value)

    rows.push(flat)

    if (fixedHeader)
      return fixedHeader

    //If no fixed header, get union of the headers for every row
    for (let field in flat)
      if ( ! ~ header.indexOf(field))
        header.push(field)

    return header
  }, ['group'])

  return rows.reduce((csv, row) => {
    return csv+'\n'+header.map(i => row[i]) //map handles differences in property ordering
  }, header)
}

function nested2flat(obj) {
  var flat = {}
  for (let i in obj) {

    if (obj[i] === null || Array.isArray(obj[i]) || typeof obj[i] != 'object') {
      flat[i] = '"'+obj[i]+'"'; continue
    }

    let flatObject = nested2flat(obj[i])

    for (let j in flatObject) {
      flat[i+'.'+j] = flatObject[j]
    }
  }
  return flat
}

exports.validate = function(model) {
  return model
    .ensure('_id').custom(authorized).withMessage('You are not authorized to modify this account')
}

//Context-specific - options MUST have 'this' property in order to work.
function authorized(doc) {
  return doc._rev.split('-')[0] == 1 || doc._id == this.account._id
}

exports.authorized = {
  *get() {
    //Search for all accounts (recipients) that have authorized this account as a sender
    //shortcut to /accounts?selector={"authorized":{"$elemMatch":"${session.account}"}}
    this.status = 501 //not implemented
  },
  *post() {
    //Authorize a sender
    console.log(this.account._id, this.req.body)
    let account = yield this.db.account.get(this.account._id)

    //allow body to be an array of ids to authorize
    let index = account.authorized.indexOf(this.req.body)

    if (index != -1) {
      this.status  = 409
      this.message = 'This account is already authorized'
    } else {
      account.authorized.push(this.req.body)
      this.body = yield this.db.account.put(account)
      this.body.authorized = account.authorized
    }
  },

  *delete() {
    //Unauthorize a sender
    let account = yield this.db.account.get(this.account._id)

    //allow body to be an array of ids to unauthorize
    let index   = account.authorized.indexOf(this.req.body)

    if (index == -1) {
      this.status  = 409
      this.message = 'This account is already not authorized'
    } else {
      account.authorized.splice(index, 1)
      this.body = yield this.db.account.put(account)
      this.body.authorized = account.authorized
    }
  }
}

function authorized(doc, account_id) {
  //doc._rev.split('-')[0] == 1 allows for new users to be added
  return ~ doc._id.indexOf('_design/') ? false : doc._rev.split('-')[0] == 1 || doc._id == account_id
}
