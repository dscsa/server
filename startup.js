var couch  = require('./couch')
var secret = require('../development')

//TODO set _users db admin role to ['user']
//TODO set this on the command line rather than in code
var auth  = 'Basic '+new Buffer(secret.username+':'+secret.password).toString('base64')

var _design = {
  accounts:{
    //TODO make it so they can only see accounts in their state
    filters:function(doc, req){ return true },
    views:{
      authorized:function(doc) { emit(doc._id)}
    }
  },
  _users:{
    //Only see users within your account
    filters:function(doc, req){ return doc.account == req.userCtx.roles[0] },
    views:{
      authorized:function(doc) { emit(doc.account)}
    }
  },
  drugs:{
    //Everyone can see all drugs
    filters:function(doc, req){ return true },
    views:{
      authorized:function(doc) { emit(doc._id)}
    }
  },
  shipments:{
    filters:function(doc, req){
      var account  = req.userCtx.roles[0]
      var accounts = doc._id.split('.')
      return accounts[0] == account|| accounts[1] == account
    },
    views:{
      authorized:function(doc) {
        var accounts = doc._id.split('.')
        emit(accounts[0])
        emit(accounts[1])
      }
    }
  },
  transactions:{
    filters:function(doc, req) {
      if ( ! doc.shipment)
        return false

      var account = req.userCtx.roles[0]
      var accounts = doc.shipment.split('.')
      return accounts[0] == account|| accounts[1] == account
    },
    views: {
      authorized:function(doc) {
        if ( ! doc.shipment)
          return false

        var accounts = doc.shipment.split('.')
        emit(accounts[0])
        emit(accounts[1])
      },

      history:function(doc) {
        for (var i in doc.history)
          emit(doc.history[i].transaction)
      }
    }
  }
}
Object.keys(_design).forEach(function(name) {
  couch(this, 'PUT').path('/'+name).headers({authorization:auth}).proxy(false)
  .then(function() {
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
    couch(this, 'PUT').path('/'+name+'/_design%2fauth').headers({authorization:auth}).body(body).then()
  })
  .catch(function(err) {
    console.log('Error adding design files:', err)
  })
})

couch(this, 'PUT').path('/drugs/0002-4420').headers({authorization:auth}).body({
  "name":"Olanzapine",
  "strength":"20mg",
  "form":"Tablet",
  "brand":"Zyprexa",
  "labeler":"Eli Lilly",
  "ndc":"0002-4420",
  "nadac":{"price":"0.40", "date":"11/11/1111"},
  "image":"http://pillbox.nlm.nih.gov/assets/large/000024420.jpg"
}).then()

couch(this, 'PUT').path('/drugs/0071-0155').headers({authorization:auth}).body({
  name:'Atorvastatin',
  strength:'10mg',
  form:'Tablet',
  brand:'Lipitor',
  labeler:'Pfizer',
  ndc:'0071-0155',
  nadac:{price:'0.05', date:'11/11/1111'},
  image:'http://pillbox.nlm.nih.gov/assets/large/00071-0155-23_711C38F1.jpg'
}).then()

couch(this, 'PUT').path('/drugs/0008-0836').headers({authorization:auth}).body({
  "name":"Venlafaxine",
  "strength":"150mg",
  "form":"Capsule",
  "brand":"Effexor",
  "labeler":"Wyeth",
  "ndc":"0008-0836",
  "nadac":{"price":"0.15", "date":"11/11/1111"},
  "image":"http://pillbox.nlm.nih.gov/assets/large/00008-0836-22_2D15969C.jpg"
}).then()

couch(this, 'PUT').path('/_users/_security').headers({authorization:auth}).body({
  admins:{names:[], roles: ["user"]},
  members:{names:[], roles: []}
}).then()
