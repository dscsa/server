import {inject} from 'aurelia-framework';
import {Pouch}     from '../libs/pouch'
import {Router} from 'aurelia-router'
import {canActivate} from '../resources/helpers'

//TODO this is causing Router to revert route and switches to not be upgraded @pageState()
@inject(Pouch, Router)
export class account {

  constructor(db, router){
    this.db           = db
    this.router       = router
    this.canActivate  = canActivate
    this.csvHref = window.location.protocol+'//'+window.location.hostname
    this.csvDate = `${new Date().toJSON().slice(0, -8)}`
  }

  activate() {

    this.db.user.session.get().then(session => {

      this.session = session
      this.switchUserText = "Switch User"

      //this.db.transaction.query('inventory-by-generic', {startkey:[this.account._id, 'month', date[0], date[1], drug.generic], endkey:[this.account._id, 'month', date[0], date[1], drug.generic, {}]})


      //TODO allow a valueConverter for each state or do a new search
      this.db.account.query('all-accounts', {include_docs:true}).then(accounts => {
        this.accounts = accounts.rows.map(account => account.doc).filter(account => {
          if (account._id != session.account._id)
            return true
          this.account = account
        })
      })

      return this.db.user.query('account._id', { key:session.account._id, include_docs:true})
      .then(users => {
        this.users = users.rows.map(user => user.doc)
        this.selectUser()
      })
    })
  }

  selectUser(user) {
    this.user = user || this.users.filter(user => user._id == this.session._id)[0]
  }

  saveUser() {
    this.user._id && this.db.user.put(this.user)
    return true
  }

  addUser() {
    this.users.unshift(this.user)
    this.db.user.post(this.user)
    .catch(err => {
      this.users.shift()
      this.snackbar.show(err.message || err.reason)
    })
  }

  deleteUser() {
    let index = this.users.indexOf(this.user)
    this.db.user.remove(this.user).then(_ => {
      this.users.splice(index, 1)
      this.selectUser()
    })
    .catch(err => {
      console.log(err)
      this.snackbar.show(err.message || err.reason)
    })
  }

  //Simple debounce doesn't work here to prevent double click
  //because account is not authorized until the db returns
  //which means isAuthorized isn't updated yet for the since click
  authorize(_id) {
    console.log('account.authorize', _id, this.account.authorized)
    let index  = this.account.authorized.indexOf(_id)
    let method = ~ index ? 'delete' : 'post'
    this.db.account.authorized[method](_id)
    .then(res => this.account.authorized = res.authorized)
    .catch(err => console.error('account.authorize', err))
    //TODO reset checkbox and show snackbar if change not made
  }

  showUserSwitchPage(){
    this.dialog.showModal()
  }

  phoneInAccount(phone){
    for(var i = 0; i < this.users.length; i++){
      if(this.users[i].phone.replace(/-/g,'') == phone.replace(/-/g,'')) return true
    }
    return false
  }

  switchUsers(event){
    //console.log("clicked on switch user button and read as (should say BUTTON): " + event.target.tagName)

    if(!this.phoneInAccount(this.phone)) return this.snackbar.show('Phone number is not in this account')

    console.log("switching to user",this.phone, this.password)

    this.switchUserText = "Switching..."


    this.db.user.session.post({phone:this.phone, password:this.password, switchUsers:true})
    .then(_ => {
      //console.log("user switched")
      this.router.navigate('picking')
    })
    .catch(err => {
      console.log("error:", err)
      this.snackbar.error('Login failed', err)
      this.switchUserText = "Switch User"

    })

  }


  closeSwitchUsersDialog(){
    this.dialog.close()
  }


  logout() {
    this.disableLogout = 'Uninstalling...'
    this.db.user.session.delete().then(_ => {
      this.router.navigate('login', {trigger:true})
    })
    .catch(err => console.trace('Logout failed:',err))
  }

  importCSV($event) {
    this.snackbar.show(`Uploading CSV File`) //'transaction.csv'
    const elem = $event.target
    console.log(elem.parentNode.parentNode.getAttribute('href'), elem.parentNode.parentNode.href, elem.parentNode.parentNode)
    return this.db.ajax({method:'post', url:elem.parentNode.parentNode.getAttribute('href'), body:elem.files[0], json:false})
    .then(rows => this.snackbar.show('Import Succesful'))
    .catch(err => this.snackbar.error('Import Error', err))
  }
}
