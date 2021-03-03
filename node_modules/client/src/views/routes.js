//@pageState()
export class App {

  configureRouter(config, router){
    this.routes  = router.navigation
    config.title = 'SIRUM'
    config.map([
      { route: 'login',                            moduleId: 'client/src/views/login',     title:'Login',     nav:true},
      { route: 'join',                             moduleId: 'client/src/views/join',      title:'Join',      nav:true},
      { route: 'account',                          moduleId: 'client/src/views/account',   title:'Account',   nav:true, roles:["user"]},
      { route: 'picking',                          moduleId: 'client/src/views/picking',   title:'Picking',   nav:true, roles:["user"]},
      { route: 'inventory',                        moduleId: 'client/src/views/inventory', title:'Inventory', nav:true, roles:["user"]},
      { route: ['shipments', 'shipments/:id', ''], moduleId: 'client/src/views/shipments', title:'Shipments', nav:true, roles:["user"]},
      { route: ['drugs', 'drugs/:id'],             moduleId: 'client/src/views/drugs',     title:'Drugs',     nav:true, roles:["user"]},
    ])
  }
}
