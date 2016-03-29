"use strict"
let couch  = require('./couch')({hostname:'localhost', port: 5984})
let secret = require('../development')

//TODO set _users db admin role to ['user']
//TODO set this on the command line rather than in code
let auth  = 'Basic '+new Buffer(secret.username+':'+secret.password).toString('base64')

let _design = {
  accounts:{
    //TODO make it so they can only see accounts in their state
    filters(doc, req){ return true },
    views:{
      authorized(doc) { emit(doc._id)}
    }
  },
  _users:{
    //Only see users within your account
    filters(doc, req){ return doc.account._id == req.userCtx.roles[0] },
    views:{
      authorized(doc) { emit(doc.account._id)}
    }
  },
  drugs:{
    //Everyone can see all drugs
    filters(doc, req){ return true },
    views:{
      authorized(doc) { emit(doc._id)}
    }
  },
  shipments:{
    filters(doc, req){
      var account  = req.userCtx.roles[0]
      var accounts = doc._id.split('.')
      return accounts[0] == account|| accounts[1] == account
    },
    views:{
      authorized(doc) {
        var accounts = doc._id.split('.')
        emit(accounts[0])
        emit(accounts[1])
      }
    }
  },
  transactions:{
    filters(doc, req) {
      if ( ! doc.shipment)
        return false

      var account = req.userCtx.roles[0]
      var accounts = doc.shipment._id.split('.')
      return accounts[0] == account|| accounts[1] == account
    },
    views: {
      authorized(doc) {
        if ( ! doc.shipment)
          return false

        var accounts = doc.shipment._id.split('.')
        emit(accounts[0])
        emit(accounts[1])
      },

      history(doc) {
        for (var i in doc.history)
          emit(doc.history[i].transaction._id)
      },

      drugs(doc) {
          emit(doc.drug._id)
      }
    }
  }
}
Object.keys(_design).forEach(name => {
  couch.put().url('/'+name).headers({authorization:auth})
  .then(_ => {
    var body = {
      views:{},
      filters:{account:_design[name].filters.toString()},
      lists:{all:function(head, req) {
        send('[')
        var row = getRow()
        if (row) {
          send(toJSON(row.doc))
          while(row = getRow())
            send(','+toJSON(row.doc))
        }
        send(']')
      }.toString()}
    }

    for (var i in _design[name].views) {
      body.views[i] = {map:_design[name].views[i].toString()}
    }
    couch.put().url(`/${name}/_design%2fauth`).headers({authorization:auth}).body(body).then()
  })
  .catch(err => {
    console.log('Error adding design files:', err)
  })
})

couch.put().url('/_users/_security').headers({authorization:auth})
.body({
   admins:{names:[], roles: ["user"]},
  members:{names:[], roles: []}
}).then()
