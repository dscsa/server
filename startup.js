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
    filters:function(doc, req){ return doc.account._id == req.userCtx.roles[0] },
    views:{
      authorized:function(doc) { emit(doc.account._id)}
    }
  },
  drugs:{
    //Everyone can see all drugs
    filters:function(doc, req){ return true },
    views:{
      authorized:function(doc) { emit(doc._id)}
      // , search:function(doc) {
      //
      //   var names = doc.names.concat([doc._id, doc.ndc9, doc.upc, doc.brand])
      //   var str   = doc.ndc9+" "+doc.names.join(", ")+" "+doc.form
      //   for (var i in names) {
      //     var name = names[i]
      //     for (var j=4; j<=name.length; j++) {
      //       var key = name.slice(0, j)
      //       emit(key.toLowerCase(), str.replace(key, '<strong>'+key+'<strong>'))
      //     }
      //   }
      // }
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
      var accounts = doc.shipment._id.split('.')
      return accounts[0] == account|| accounts[1] == account
    },
    views: {
      authorized:function(doc) {
        if ( ! doc.shipment)
          return false

        var accounts = doc.shipment._id.split('.')
        emit(accounts[0])
        emit(accounts[1])
      },

      history:function(doc) {
        for (var i in doc.history)
          emit(doc.history[i].transaction._id)
      },

      drugs:function(doc) {
          emit(doc.drug._id)
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

// couch(this, 'PUT').path('/drugs/0000-0000').headers({authorization:auth}).body({
//   generics:[{name:"Olanzapine 20mg"],
//   form:"Tablet",
//   brand:"Zyprexa",
//   labeler:"Eli Lilly",
//   upc:'00024420',
//   ndc9:'000024420',
//   retail:{price:0.80, date:"11/11/1111"},
//   wholesale:{price:0.40, date:"11/11/1111"},
//   image:"http://pillbox.nlm.nih.gov/assets/large/000024420.jpg"
// }).then()

// couch(this, 'PUT').path('/drugs/0071-0155').headers({authorization:auth}).body({
//   names:['Atorvastatin 10mg', 'Aspirin 5mg'],
//   form:'Tablet',
//   brand:'Lipitor',
//   labeler:'Pfizer',
//   upc:'00710155',
//   ndc9:'000710155',
//   retail:{price:0.10, date:"11/11/1111"},
//   wholesale:{price:0.05, date:"11/11/1111"},
//   image:'http://pillbox.nlm.nih.gov/assets/large/00071-0155-23_711C38F1.jpg'
// }).then()
//
// couch(this, 'PUT').path('/drugs/0008-0836').headers({authorization:auth}).body({
//   names:["Venlafaxine 150mg"],
//   form:"Capsule",
//   brand:"Effexor",
//   labeler:"Wyeth",
//   upc:'00080836',
//   ndc9:'000080836',
//   retail:{price:0.30, date:"11/11/1111"},
//   wholesale:{price:0.15, date:"11/11/1111"},
//   image:"http://pillbox.nlm.nih.gov/assets/large/00008-0836-22_2D15969C.jpg"
// }).then()

couch(this, 'PUT').path('/_users/_security').headers({authorization:auth}).body({
  admins:{names:[], roles: ["user"]},
  members:{names:[], roles: []}
}).then()
