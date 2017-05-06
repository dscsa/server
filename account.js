"use strict"
//defaults
module.exports = exports = Object.create(require('./model'))

exports.views = {
  authorized(doc) {
    for (var i in doc.authorized) {
      emit(doc.authorized[i])
    }
  },

  state(doc) {
    emit(doc.state)
  }
  //Use _bulk_get here instead? Not supported in 1.6
  //this.db.account.get({_id:{$gt:null, $in:accounts[0].authorized}}),
}

exports.inventory = function* (id) { //account._id will not be set because google does not send cookie
  let view  = this.db.transaction.query('inventory', {group_level:2, startkey:[id], endkey:[id, {}]})
  let all   = yield [view, this.db.account.get(id)]
  let order = all[1].ordered

  view = all[0].rows.map(row => {
    let generic = row.key[1]
    let o = order[generic]
    delete order[generic]
    return '"'+generic+'",'+Object.values(row.value)+','+!!o+','+orderCSV(o)
  })

  order = Object.keys(order).map(generic => '"'+generic+'"'+',0,0,0,0,'+true+','+orderCSV(order[generic]))

  this.body = ['Generic Drug,Bin Qty,Repack Qty,Pending Qty,Total Qty,Ordered,Max Inventory,Min Qty,Min Days,Verified Message,Destroyed Message,Default Location,30 day price,90 day price']
  .concat(view)
  .concat(order)
  .join('\n')
  .replace(/undefined/g, '')

  function orderCSV(o = {}) {
    return o.maxInventory+','+o.minQty+','+o.minDays+','+o.verifiedMessage+','+o.destroyedMessage+','+o.defaultLocation+','+o.price30+','+o.price90
  }
}

exports.validate = function(model) {
  return model
    .ensure('_id').custom(authorized).withMessage('You are not authorized to modify this account')
}

//Context-specific - options MUST have 'this' property in order to work.
function authorized(doc) {
  return doc._rev[0] == 1 || doc._id == this.account._id
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
    console.log(1)
    //allow body to be an array of ids to authorize
    let index = account.authorized.indexOf(this.req.body)
  console.log(2)
    if (index != -1) {
      this.status  = 409
      this.message = 'This account is already authorized'
    } else {
      account.authorized.push(this.req.body)
        console.log(3)
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
  //doc._rev[0] == 1 allows for new users to be added
  return ~ doc._id.indexOf('_design/') ? false : doc._rev[0] == 1 || doc._id == account_id
}
