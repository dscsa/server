import {inject} from 'aurelia-framework'
import {Router} from 'aurelia-router'
import {Pouch}     from '../libs/pouch'
import {canActivate} from '../resources/helpers'


@inject(Pouch, Router)
export class login {

  constructor(db, router){
    this.db          = db
    this.router      = router
    this.phone       = ''
    this.password    = ''
    this.canActivate = canActivate
  }

  login() {
    this.db.user.session.post({phone:this.phone, password:this.password})
    .then(loading => {
      this.disabled = true

      //wait for all resources except 'drugs' to sync
      this.loading  = loading.resources
      this.progress = loading.progress

      return Promise.all(loading.syncing)
    })
    .then(resources => {
      this.router.navigate('picking')
    })
    .catch(err => {
      this.disabled = false
      this.snackbar.error('Login failed', err)
    })
  }
}
