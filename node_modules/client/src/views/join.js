import {inject}     from 'aurelia-framework'
import {Router}     from 'aurelia-router'
import {Pouch}         from '../libs/pouch'
import {HttpClient} from 'aurelia-http-client'
import {canActivate} from '../resources/helpers'

//@pageState()
@inject(Pouch, Router, HttpClient)
export class join {

  constructor(db, router, http){
    this.db     = db
    this.router = router
    this.http   = http

    this.account = {
      name:'',
      license:'',
      street:'',
      city:'',
      state:'',
      zip:'',
      ordered:{}
    }

    this.user = {
      name:{first:'',last:''},
      phone:''
    }
    this.canActivate = canActivate
  }

  join() {

    this.disabled = true
    this.user.account = {_id:this.account.phone}

    this.db.user.post(this.user)
    .then(res => {
      console.log('this.db.user.post success', res, this.user)
      return this.db.account.post(this.account)
    })
    .then(res => {
      //local user is created but now replicator must call bulk docs which then triggers creation of a
      //_user login. Since, we don't know exactly how long this will take so we must do a timeout here
      console.log('this.db.account.post success', res, this.account)
      return new Promise(resolve => setTimeout(resolve, 5000))
    })
    .then(_ => {
      return this.db.user.session.post(this.user)
    })
    .then(loading => {
      console.log('this.db.user.session.post success', loading)
      //wait for all resources except 'drugs' to sync .filter(r => r.name != 'drugs')
      this.loading  = loading.resources
      this.progress = loading.progress

      return Promise.all(loading.syncing)
    })
    .then(_ => {
      console.log('join success', _)
      return this.router.navigate('shipments')
    })
    .catch(err => {
      this.disabled = false

      err.account = this.account
      err.user = this.user

      if (err.message == "Document update conflict")
        err.message = "phone number must be unique"

      this.snackbar.error('Join failed', err)
    })
  }
}
