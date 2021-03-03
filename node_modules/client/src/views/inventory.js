import {inject} from 'aurelia-framework';
import {Pouch}     from '../libs/pouch'
import {Router} from 'aurelia-router';
import {csv}    from '../libs/csv'
import {clearNextProperty, canActivate, expShortcuts, qtyShortcuts, removeTransactionIfQty0, incrementBin, saveTransaction, focusInput, drugSearch, groupDrugs, drugName, waitForDrugsToIndex, toggleDrawer, getHistory, currentDate} from '../resources/helpers'

@inject(Pouch, Router)
export class inventory {

  constructor(db, router){
    this.db      = db
    this.router  = router
    this.csv     = csv
    this.transactions = []
    this.pended = {}
    this.shoppingSyncPended = {}
    this.intervalId = ''

    this.placeholder     = "Search by generic name, ndc, exp, or bin" //Put in while database syncs
    this.waitForDrugsToIndex = waitForDrugsToIndex
    this.expShortcuts    = expShortcuts
    this.clearNextProperty = clearNextProperty
    this.qtyShortcutsKeydown    = qtyShortcuts
    this.removeTransactionIfQty0 = removeTransactionIfQty0
    this.saveTransaction = saveTransaction
    this.incrementBin    = incrementBin
    this.focusInput      = focusInput
    this.drugSearch      = drugSearch
    this.drugName        = drugName
    this.groupDrugs      = groupDrugs
    this.canActivate     = canActivate
    this.toggleDrawer    = toggleDrawer
    this.getHistory      = getHistory
    this.currentDate     = currentDate
    this.reset           = $event => {
      if ($event.newURL.slice(-9) == 'inventory') {
        this.term = ''
        this.setTransactions()
      }
    }
  }

  deactivate() {
    window.removeEventListener("hashchange", this.reset)
    window.removeEventListener("visibilitychange", _ => this.syncPended())
    clearInterval(this.intervalId) //otherwise setinterval keeeps running and bringing the user back to the inventory page
  }

  activate(params) {
    //TODO find a more elegant way to accomplish this
    window.addEventListener("hashchange", this.reset)
    window.addEventListener("visibilitychange", _ => this.syncPended())
    //TODO replace this with page state library

    this.db.user.session.get().then(session => {

      this.user    = { _id:session._id}
      this.account = { _id:session.account._id} //temporary will get overwritten with full account

      this.db.user.get(this.user._id).then(user => {this.router.routes[2].navModel.setTitle(user.name.first)}) //st 'Account to display their name

      this.db.account.get(session.account._id).then(account => {
        this.account = account

        this.syncPended(1).then(_ => {
          let keys = Object.keys(params)
          if (keys[0]) this.selectTerm(keys[0], params[keys[0]])
        })

        this.intervalId = setInterval(_ => this.syncPended(), 5 * 60 * 1000) //pull and update the pended every five minutes.save result so you can stop when we leave page
      })


    })
  }

  //Refreshes the pended drawer. With a setinterval and eventlistener, this should
  //run every 5 minutes, and whenever the user opens the page (either first time or
  //returning from another tab)
  syncPended(inActivate = false){
    //console.log(document.visibilityState)

    if((inActivate) || (document.visibilityState == 'visible')){
      console.log("syncing!")
      //Since pended are set into an object rather than array we don't have control to append to
      //beginning or end (object keys are iterated in the order they are added), this will always
      //push new pended keys to the last keys in the object.  But we want new keys to be listed first
      //in the pended drawer so we use unshift to reverse the order inside the pendedFilter which means
      //we do NOT want to reverse the order here (they would be reversed twice which would negate it)
      return this.db.transaction.query('currently-pended-by-group-priority-generic', {include_docs:true, reduce:false, startkey:[this.account._id], endkey:[this.account._id, {}]})
      .then(res => {
        this.pended = {}
        this.shoppingSyncPended = {}
        this.setPended(res.rows.map(row => row.doc))
        this.refreshPended() //not needed on development without this on production, blank drawer on inital load
      })
    }

  }

  clickOnGroupInDrawer(event,pendId){
    if(event.target.tagName == "SPAN"){
      if(this.shoppingSyncPended[pendId].locked) return;
      this.togglePriority(pendId)
    } else {
      this.selectTerm('pended', pendId)
    }
  }

  clickOnTransactionInDrawer(isReal,$event,pendKey,label){
    if((event.target.tagName == "SPAN") && isReal){
      this.toggleDrawerCheck(pendKey,label)
    } else if((event.target.tagName == "DIV") && !isReal){
      this.selectTerm('pended',pendKey+': '+label)
    }
  }

  //should only ever uncheck if cindy wants to unpend something, should be infrequent
  //button will be disabled if there's a picked property. so we have to use the priority property of pended
  //if pended.priority = true, its priority. if = false, it's not. if = null, then it's inbetween pended and picked, and
  //will appear in the pended drawer, but not on the shopping sheet
  toggleDrawerCheck(pendId, label){
    if(this.shoppingSyncPended[pendId][label].locked) return;

    this.shoppingSyncPended[pendId][label].drawerCheck = !this.shoppingSyncPended[pendId][label].drawerCheck

    let temp_transactions = this.extractTransactions(pendId, label) //this is an array in case multiple generics
    //console.log(temp_transactions)

    for(let i = 0; i < temp_transactions.length; i++){
      temp_transactions[i].next[0].pended.priority = this.shoppingSyncPended[pendId][label].drawerCheck ? false : null;
      //console.log(temp_transactions[i])
    }

    return this.db.transaction.bulkDocs(temp_transactions)
    .catch(err => this.snackbar.error('Error removing inventory. Please reload and try again', err))
  }


  togglePriority(pendId){
    //switcht the priority in
    this.shoppingSyncPended[pendId].priority = ! this.shoppingSyncPended[pendId].priority
    let transactions_to_update = this.extractTransactions(pendId, '') //gives an array of transactions that need to have priority toggled, then saved

    for(let i = 0; i < transactions_to_update.length; i++){
      if(typeof transactions_to_update[i].next[0].pended.priority != 'undefined' && transactions_to_update[i].next[0].pended.priority == null) continue; //then it's locked so don't
      transactions_to_update[i].next[0].pended.priority = transactions_to_update[i].next[0].pended.priority ? !transactions_to_update[i].next[0].pended.priority : true; //if it exists, flip, otherwise that means never added, so make true
    }

    return this.db.transaction.bulkDocs(transactions_to_update)
    .then(res => {
      console.log('priority switched for pendId:', pendId)
      console.log('results:',res)
    }).catch(err => {
      console.log("error with toggling priority", JSON.stringify(err))
      this.snackbar.error('Error toggling priority', err)
    })
    //extract all the transactions, switch their priority, update the group's priority tag in this.pended[], and save
  }

  toggleCheck(transaction) {
    //console.log('toggleCheck transaction',  transaction)
    this.setCheck(transaction, ! transaction.isChecked)
  }

  //Check all visible (non-filtered) transactions
  toggleVisibleChecks() {
    this.setVisibleChecks( ! this.filter.checked.visible)
  }

  setVisibleChecks(isChecked) {
    if ( ! this.filter) return

    let filtered = inventoryFilterValueConverter.prototype.toView(this.transactions, this.filter)

    for (let transaction of filtered)
      this.setCheck(transaction, isChecked)

    this.filter.checked.visible = isChecked
  }

  //Cannot rely on 'this' other than this.filter
  //because used by inventoryFilterValueConverter
  setCheck(transaction, isChecked) {

    const qty = transaction.qty.to || transaction.qty.from || 0

    if (isChecked && ! transaction.isChecked) {
      this.filter.checked.qty += qty
      this.filter.checked.count++
    }

    if ( ! isChecked && transaction.isChecked) {
      this.filter.checked.qty -= qty
      this.filter.checked.count--
      this.filter.checked.visible = false
    }

    return transaction.isChecked = isChecked
  }

  setTransactions(transactions = [], type) {

    //Sort X00 bin alphabetically per Cindy's request.
    if ( ~ ['M00', 'T00', 'W00', 'R00', 'F00', 'X00', 'Y00', 'Z00'].indexOf(this.term))
      transactions = transactions.sort((a,b) => {
        if (a.drug.generic < b.drug.generic) return -1
        if (b.drug.generic < a.drug.generic) return 1
      })

    this.transactions = transactions
    this.noResults    = this.term && ! transactions.length
    this.filter = {} //after new transactions set, we need to set filter so checkboxes don't carry over
  }

  search() {

    console.log('search', this.term)

    if (this.isBin(this.term))
      return this.selectTerm('bin', this.term)

    if (this.isExp(this.term))
      return this.selectTerm('exp<', this.term, true)

    //Drug search is by NDC and we want to group by generic
    this.drugSearch().then(drugs => {
      console.log(drugs.length, this.account.ordered, this.account)
        this.groups = this.groupDrugs(drugs, this.account.ordered)
        console.log(drugs.length, this.groups.length, this.groups)
    })
  }

  isRepack(transaction) {
    return transaction.bin && transaction.bin.length == 3
  }

  isBin(term) { //unlike shipment page allow for B00* to search all sections within large B00 bin but don't include repacks
    return /^[A-Za-z][0-6]?\d[\d*]$/.test(term)
  }

  isExp(term) {
    return /^20\d\d-\d\d-?\d?\d?$/.test(term)
  }

  selectPended(pendedKey) {

    const [pendId, label] = pendedKey.split(': ')

    let transactions = this.extractTransactions(pendId, label);

    if (transactions)
      this.term = 'Pended '+pendedKey

    transactions.sort(this.sortPended.bind(this))

    this.setTransactions(transactions)
    this.toggleDrawer()
  }

  extractTransactions(pendId, label){
    //console.log("1_")
    let transactions = Object.values(this.pended[pendId] || {}).reduce((arr, pend) => {
         return ((! label || pend.label == label)) ? arr.concat(pend.transactions) : arr
    }, [])
    //console.log("2_")
    //console.log(transactions)
    return transactions
  }

  selectInventory(type, key, limit) {
    this.term = key

    let opts = {include_docs:true, limit, reduce:false}

    if (type == 'bin' && key.length == 3) {
      var query  = 'inventory-by-bin-verifiedat'
      var bin    = key.split('')
      opts.startkey = [this.account._id, '', bin[0], bin[2], bin[1]]
      opts.endkey   = [this.account._id, '', bin[0], bin[2], bin[1], {}]
    } else if (type == 'bin' && key[3] == '*') {
      var query  = 'inventory-by-bin-verifiedat'
      var bin    = key.split('')
      opts.startkey = [this.account._id, bin[0], bin[2], bin[1]]
      opts.endkey   = [this.account._id, bin[0], bin[2], bin[1], {}]
    } else if (type == 'bin' && key.length == 4) {
      var query  = 'inventory-by-bin-verifiedat'
      var bin    = key.split('')
      opts.startkey = [this.account._id, bin[0], bin[2], bin[1], bin[3]]
      opts.endkey   = [this.account._id, bin[0], bin[2], bin[1], bin[3], {}]
    } else if (type == 'exp<') {
      var query = 'expired-by-bin'
      var [year, month] = key.split('-')
      opts.startkey = [this.account._id, year, month]
      opts.endkey   = [this.account._id, year, month+'\uffff']
    } else if (type == 'generic') {
      //Only show medicine at least one month from expiration
      //just in case there is a lot of it and limit prevent us from seeing more
      var query = 'inventory-by-generic'
      var [year, month] = this.currentDate(limit ? 1 : 0, true)
      opts.startkey = [this.account._id, 'month', year, month, key]
      opts.endkey   = [this.account._id, 'month', year, month, key, {}] //Use of {} rather than \uffff so we don't combine different drug.forms
    }

    const setTransactions = res => {

      //so that we correctly display the 'show all' option
      if (res.rows.length == limit) {
        this.type = type
        this.snackbar.show(`Displaying first 100 results`)
      } else {
        this.type = null
      }

      //Service inventory.qty includes everything that WAS in inventory at that date if this
      //is a past date some of these items may now be gone (e.g have a value in next property)
      //In the future may want to make the Server's Inventory View Metafunction to be
      //var removedAt  = require('nextAt')(doc) && (require('nextAt')(doc) < require('expiredAt')(doc)) ? require('nextAt')(doc) : require('expiredAt')(doc) rather than
      //var removedAt  = require('nextAt')(doc) || require('expiredAt')(doc)
      //But not sure how this would affect other views.  Would need to test on test server
      let docs = []
      for (let row of res.rows) {
        if (!row.doc.next.length || (type == 'bin' && row.doc.next[0].pended && !row.doc.next[0].picked)) docs.push(row.doc)
        else console.log('Excluded from inventory list due to next prop:', row.doc.next, row.doc)
      }

      return this.setTransactions(docs, type)

    }
    this.db.transaction.query(query, opts).then(setTransactions)
  }

  selectTerm(type, key) {

    console.log('selectTerm', type, key)

    this.setVisibleChecks(false) //reset selected qty back to 0
    this.repacks = []  //empty and left over repacks

    type == 'pended'
      ? this.selectPended(key)
      : this.selectInventory(type, key, 100)

    this.router.navigate(`inventory?${type}=${key}`, {trigger:false})
  }

  refreshFilter(obj) {
    if (obj) obj.val.isChecked = ! obj.val.isChecked
    this.filter = Object.assign({}, this.filter)
  }

  refreshPended() {

    //Aurelia doesn't provide an Object setter to detect arbitrary keys so we need
    //to trigger and update using Object.assign rather than just adding a property
    this.pended = Object.assign({}, this.pended)
  }

  updateSelected(updateFn) {
    const length = this.transactions.length
    let checkedTransactions = []
    //since we may be deleting as we go, loop backward
    for (let i = length - 1; i >= 0; i--)  {
      let transaction = this.transactions[i]

      if ( ! transaction.isChecked) continue

      checkedTransactions.unshift(transaction)

      //Remove from transactions displayed. This currently works because all actions
      //pend, unpend, dispense, and repack remove transaction from the current list
      //if we add another action where this is not true, we will need to pass an additional parameter.
      this.setCheck(transaction, false)
      this.transactions.splice(i, 1) //optimistic UI

      //If pended we want to move it.  Dispense/disposed/unpend all remove from pended
      this.unsetPended(transaction)

      updateFn(transaction)
    }

    this.refreshPended() //unsetPended and updateFn may (un)pend some items

    this.filter.checked.visible = false

    //Save the transactions.  TODO should we preverse order by saving i from loop above?
    return this.db.transaction.bulkDocs(checkedTransactions)
    .catch(err => this.snackbar.error('Error removing inventory. Please reload and try again', err))
  }

  unpendInventory() {
    const term = this.repacks.drug.generic
    this.updateSelected(transaction => {
      let next = this.clearNextProperty(transaction.next, 'pended')
      transaction.isChecked = false
      transaction.next = next
    })
   .then(_ => term ? this.selectTerm('generic', term) : this.term = '') //We must let these transactions save without next for them to appear back in inventory
  }

  //TODO: when removing the hacky functionality with concatenated strings, expand this to add further validation
  validateGroupName(group){
    return !(~ group.indexOf(": "))
  }

  //Three OPTIONS
  //1) They pick an existing pendId and _id is passed as parameter
  //2) They type in their own pendId and pendToId is passed as parameter
  //3) They do Pend New without a pendId in which case the createdAt date will be used later
  pendInventory(group, pendQty) {

    if(!this.validateGroupName(group)){
        console.error('invalid group name:', group)
        return this.snackbar.show(`Cannot pend to invalid group name "` + group + '"')
    }

    let toPend = []
    let repackQty = pendQty
    let pended_obj = {_id:new Date().toJSON(), user:this.user, repackQty: repackQty, group: group}

    let transactions_in_group = this.extractTransactions(group, '') //gives an array of transactions that need to have priority toggled, then saved
    console.log("other transactions already in group:", transactions_in_group)

    let should_lock = false

    //TODO: cleaner to consolidate this into extractTransactions and return two values there
    for(let i = 0; i < transactions_in_group.length; i++){
      if(transactions_in_group[i].next[0].pended.priority) pended_obj.priority = true;
      if(transactions_in_group[i].next[0].picked && !transactions_in_group[i].next[0].picked._id) should_lock = true //if items are fully picked, dont lock. if theyre currently locked, this should be too
    }

    let pendId = group

    this.updateSelected(transaction => {
      let next = transaction.next ? transaction.next : [{}]
      if(next.length == 0){
        next = [{}]
      }
      next[0].pended = pended_obj
      if(should_lock) next[0].picked = {}
      transaction.isChecked = false
      transaction.next = next
      toPend.push(transaction)
    })

    //Since transactions pushed to pendying syncronously we get need to wait for the save to complete
    //Generic search is sorted primarily by EXP and not BIN.  This is correct on refresh but since we
    //want pended queue to be ordered by BIN instantly we need to mimic the server sort on the client
    this.setPended(toPend)

    let label = pendId

    if (this.repacks.drug.generic) //not true if we are showing multiple drugs e.g search by exp date, fulled pended order, bin
      label += ': '+this.pended[pendId][this.repacks.drug.generic].label //must wait until after setPended

    this.selectTerm('pended', label)
  }

  pickInventory(basketNumber){

    if(!basketNumber.length) return //TODO: do we want more functionality from this?

    console.log("trying to pick into " + basketNumber)

    this.updateSelected(transaction => {
      console.log("picking:", transaction)

      let next = transaction.next
      if(next.length && next[0].picked && next[0].picked._id) next[0].picked.basket = basketNumber

      transaction.next = next

    }).then(_ => {
      this.syncPended().then(_ => {
        this.selectTerm('pended',this.term.split(":")[0].replace("Pended ",""))
      })

    })

  }

  sortPended(a, b) {

    var aPack = this.isRepack(a)
    var bPack = this.isRepack(b)

    if (aPack > bPack) return -1
    if (aPack < bPack) return 1

    //Flip columns and rows for sorting, since shopping is easier if you never move backwards
    let aBin = a.bin[0]+a.bin[2]+a.bin[1]+(a.bin[3] || '')
    let bBin = b.bin[0]+b.bin[2]+b.bin[1]+(b.bin[3] || '')

    if (aBin > bBin) return 1
    if (aBin < bBin) return -1

    return 0
  }

  //Group pended into this structure {drug:{pendedAt1:[...drugs], pendedAt2:[...drugs]}}
  //this will allow easy functionality of the "Pend to" feature in case someone forgot to
  //pend a drug with the original group.
  setPended(transactions) {

    for (let transaction of transactions) {
      //skipped picked transactions ACTUALLY NO, we used to, but commented out. Keeping her in case
      //of change of mind 12/31/19
      //if(transaction.next[0].picked ? transaction.next[0].picked._id : false) continue

      //We want to group by PendId and not PendQty so detach pendQty from pendId and prepend it to generic instead
      let pendId  = this.getPendId(transaction)
      let pendQty = this.getPendQty(transaction)

      let generic = transaction.drug.generic
      let label   = generic + (pendQty ? ' - '+pendQty : '')

      this.pended[pendId] = this.pended[pendId] || {}
      this.pended[pendId][generic] = this.pended[pendId][generic] || {label, transactions:[]}
      this.pended[pendId][generic].transactions.push(transaction)

      this.shoppingSyncPended[pendId] = this.shoppingSyncPended[pendId] || {}

      this.shoppingSyncPended[pendId].locked =  this.shoppingSyncPended[pendId].locked == false ? false : (transaction.next[0].picked ? true : false);

      this.shoppingSyncPended[pendId].priority = transaction.next[0].pended.priority ? transaction.next[0].pended.priority : false; //this will read false for limbo-ed transaction where priority = null, but thats fine.
      this.shoppingSyncPended[pendId][label] = this.shoppingSyncPended[pendId][label] || {}
      this.shoppingSyncPended[pendId][label].drawerCheck = typeof transaction.next[0].pended.priority == 'undefined' ? true: (transaction.next[0].pended.priority != null)

      this.shoppingSyncPended[pendId][label].locked = this.shoppingSyncPended[pendId].locked //transaction.next[0].picked ? true : false;
      //TODO: condense all these basket fields
      let basketFound = transaction.next[0].picked && transaction.next[0].picked.basket
      this.shoppingSyncPended[pendId][label].basketInfo = this.shoppingSyncPended[pendId][label].basketInfo || {}
      this.shoppingSyncPended[pendId][label].basketInfo.found = this.shoppingSyncPended[pendId][label].basketInfo.found ? this.shoppingSyncPended[pendId][label].basketInfo.found : basketFound
      this.shoppingSyncPended[pendId][label].basketInfo.notFound = this.shoppingSyncPended[pendId][label].basketInfo.notFound ? this.shoppingSyncPended[pendId][label].basketInfo.notFound : !basketFound
      this.shoppingSyncPended[pendId][label].basketInfo.basket = this.shoppingSyncPended[pendId][label].basketInfo.basket ? this.shoppingSyncPended[pendId][label].basketInfo.basket : (basketFound ? transaction.next[0].picked.basket  : null )
      if(basketFound){
        let basket = transaction.next[0].picked.basket
        if(!this.shoppingSyncPended[pendId][label].basketInfo.allBaskets) this.shoppingSyncPended[pendId][label].basketInfo.allBaskets = []
        if((!(~this.shoppingSyncPended[pendId][label].basketInfo.allBaskets.indexOf(basket))) && (transaction.next[0].picked.matchType !== 'missing'))  this.shoppingSyncPended[pendId][label].basketInfo.allBaskets.unshift(basket)
      }

    }

    //console.log(this.shoppingSyncPended)
    //console.log(this.pended)

  }

  unsetPended(transaction) {

    if ( ! transaction.next[0] || ! transaction.next[0].pended)
      return //called indiscriminately from updateSelected

    const generic = transaction.drug.generic
    const pendId  = this.getPendId(transaction)

    let i = this.pended[pendId][generic].transactions.indexOf(transaction)

    this.pended[pendId][generic].transactions.splice(i, 1) //Assume transaction is found and i is not false

    //console.log(pendId, generic, i, 'of', this.pended[pendId][generic].transactions.length)

    if ( ! this.pended[pendId][generic].transactions.length)
      delete this.pended[pendId][generic]

    if ( ! Object.keys(this.pended[pendId]).length)
      delete this.pended[pendId]

    //NOTE Developer should call this.refreshPended() after all transactions are unpended
  }

  dispenseInventory() {
    const dispensed_obj = { _id: new Date().toJSON(), user: this.user  }

    this.updateSelected(transaction => {
      let next = transaction.next
      if(next.length == 0) next = [{}]
      next[0].dispensed = dispensed_obj //so we don't modify other data

      transaction.next = next
    })
  }

  disposeInventory() {
    const disposed_obj = { _id: new Date().toJSON(), user:  this.user  }
    this.updateSelected(transaction => {
      console.log("disposing:", transaction)

      let next = transaction.next
      if(next.length == 0) next = [{}]
      next[0].disposed = disposed_obj //so we don't modify other data


      transaction.next = next
    })
  }

  //TODO this allows for mixing different NDCs with a common generic name, should we prevent this or warn the user?
  repackInventory() {

    if ( ! this.repacks.drug || ! this.filter.checked.count) {
      console.error('repackInventory called incorrectly. Aurelia should have disabled (problem with custom "form" attribute)', 'this.repacks.drug', this.repacks.drug, this.filter.checked.count)
      return this.snackbar.show(`Repack Drug Error`)
    }

    //Without this the below happened 52 < 90 causing a 38qty error in Verified - Expired - Disposed - Dispensed - Old Inventory + New Inventory = 38.  However someone could change a quantity after it is repacked and still cause an issue
    //2018-11-19T18:14:46.034300Z (Qty 18 Old Inventory) + 2018-11-28T21:57:05.481600Z (Qty 6 Old Inventory) + 2018-12-04T18:02:50.084500Z (Qty 28 Verified) ---> 2018-12-06T17:33:37.030300Z (Qty 30 Disposed) +  2018-12-06T17:33:37.048700Z (Qty 60 Repacked: 11 Disposed + 22 Dispensed + 27 New Inventory)
    let total = this.repacks.reduce((total, repack) => total+repack, 0)
    if (total > this.repacks.excessQty) {
      console.error('repackInventory quantity is incorrect. ', 'this.repacks.excessQty', this.repacks.excessQty, 'this.repacks', this.repacks)
      return this.snackbar.show(`Repack Qty Error`)
    }

    let next = (this.transactions[0].next && this.transactions[0].next.pended) ? [{pended:this.transactions[0].next[0].pended}] : []

    //TODO: here you want to add the pended of the original transaction onto the new one don't you?

    let newTransactions = [],
        createdAt = new Date().toJSON()

    //Keep record of any excess that is implicitly destroyed.  Excess must be >= 0 for recordkeeping
    //and negative excess (repack has more quantity than bins) is disallowed by html5 validation
    //because we don't know where the extra pills came from.  If 0 still keep record in case we need to
    //adjust it after the fact (on sever with reconcileRepackQty)
    newTransactions.push({
      exp:{to:this.repacks[0].exp, from:null},
      qty:{to:this.repacks.excessQty, from:null},
      user:this.user,
      shipment:{_id:this.account._id},
      drug:this.repacks.drug,
      next:[{ disposed: { _id: new Date().toJSON(), user:  this.user  } }]
    })



    //Create the new (repacked) transactions
    for (let repack of this.repacks) {

      if ( ! repack.bin || ! repack.exp || ! repack.qty) //ignore last row
        continue

      let newTransaction = {
        exp:{to:repack.exp, from:null},
        qty:{to:+repack.qty, from:null},
        user:this.user,
        shipment:{_id:this.account._id},
        bin:repack.bin,
        drug:this.repacks.drug,
        next:[]
      }



      //Only add to display if we are not in pended screen
      //if pended we don't want it to appear
      if (this.term.slice(0,7) != 'Pended')
        this.transactions.unshift(newTransaction)

      newTransactions.push(newTransaction)
    }

    console.log('newTransaction',  this.repacks.length, this.repacks, newTransactions.length, newTransactions)


    //Once we have the new _ids insert them into the next property of the checked transactions
    this.db.transaction.bulkDocs(newTransactions).then(rows => {

      //Since removing from array go backwards to ensure that indexes remain in sync
      let errors = []
      for (let i = rows.length - 1; i >= 0; i--) {
        if ( ! rows[i].error) continue
        if ( ! errors.includes(rows[i].message)) errors.push(rows[i].message)
        this.transactions.splice(i, 1)
      }

      if (errors.length) {
        console.error('Repacked vials could not be created', errors, rows)
        return this.snackbar.show(`Repack error `+errors.join(', '))
      }

      console.log('Repacked vials have been created', rows)


      let repacked_obj = {_id: new Date().toJSON(),   user: this.user , transactions: [] }

      const transactions_arr = rows.map(row => {
        return {_id:row.id}
      })

      repacked_obj.transactions = transactions_arr

      this.updateSelected(transaction => {
        let temp_next = transaction.next
        if(temp_next.length == 0) temp_next = [{}]
        temp_next[0].repacked = repacked_obj
        transaction.next = temp_next
      })

      this.printLabels(newTransactions.slice(1)) //don't include the "excess" one

    }).catch(err => {
      console.error(err)
      this.snackbar.show(`Transactions could not repackaged: ${err.reason}`)
    })
  }

  getPendId(transaction) {

    //getPendId from a transaction
    if (transaction) {

      const pendId  = transaction.next[0] ? transaction.next[0].pended.group : null
      const created = transaction.next[0] ? transaction.next[0].pended._id : transaction._id

      return pendId ? pendId : created.slice(5, 16).replace('T', ' ')  //Google App Script is using Pend Id as "Order# - Qty" and we want to group only by Order#.
    }

    //Get the currectly selected pendId
    //Hacky. Maybe we should set these individually rather than splitting them.
    return this.term.replace('Pended ', '').split(': ')[0]
  }

  getPendQty(transaction) {

    //getPendId from a transaction
    if (transaction) {
      const pendId  = transaction.next[0] ? transaction.next[0].pended.repackQty : null
      return pendId ? pendId : undefined
    }

    return this.term.split(' - ')[1]
  }


  printLabels(transactions) {

    transactions = transactions || this.transactions.filter(t => t.isChecked)
    let pendId   = this.getPendId()
    let numDrugs = '?'

    if (this.shoppingSyncPended[pendId]) //this.pended gets updated as drugs are repacked, where as this one should give a consistent count
      numDrugs = Object.keys(this.shoppingSyncPended[pendId]).length - 2   //CK wants label to show how many drugs in the order. -2 for "priority" and "locked" priorities
    else
      console.log(pendId, this.pended, this.shoppingSyncPended)

    let labels = transactions.map(transaction => {
      return [
        `<p style="page-break-after:always; white-space:nowrap">`,
        `<strong>${transaction.drug.generic}</strong>`,
        transaction._id.slice(2, -1),
        `Ndc ${transaction.drug._id}`,
        `Exp ${transaction.exp.to.slice(0, 7)}`,
        `Bin ${transaction.bin}`,
        `Qty ${transaction.qty.to}`,
        pendId+', #'+numDrugs, //needs to work for X00 bins that are technically no longer pended, default to this? -> transaction.next[0] && transaction.next[0].pended && transaction.next[0].pended._id,
        `Pharmacist ________________`,
        `</p>`
      ].join('<br>')
    })

    let win = window.open()
    if ( ! win)
      return this.snackbar.show(`Enable browser pop-ups to print vial labels`)

    win.document.write(labels.join(''))
    win.print()
    win.close()
  }

  //Upon repacking, excess forced to be >= 0 and is recorded as a new transaction that was "disposed"
  //However we want to allow users to adjust repack quantities after being made.  To do this we need to
  //adjust the excess quantity up or down accordingly.
  saveAndReconcileTransaction(transaction) {
    console.log('saveAndReconcileTransaction')
    //Get current qty so we can see if the qty changed
    this.db.transaction.get(transaction._id).then(repack => {
      const qtyChange = transaction.qty.to - repack.qty.to

      if ( ! qtyChange) {
        return this.saveTransaction(transaction)
      }

      //Reload filter to get updated quantities
      this.transactions = this.transactions.slice()

      if (transaction.isChecked) //Update total selected
        this.filter.checked.qty += qtyChange

      console.log('saveAndReconcileTransaction', qtyChange, transaction.qty.to, repack.qty.to)

      //TODO: what to do here?
      return this.db.transaction.query('next.transaction._id', {key:[this.account._id, transaction._id], include_docs:true}).then(res => {

        if ( ! res.rows.length) {
          return this.saveTransaction(transaction)
        }

        let excess = res.rows.pop().doc.next.pop().transaction._id

        return this.db.transaction.get(excess).then(excess => {
            excess.qty.to -= qtyChange

            if (excess.qty.to < 0) {
              transaction.qty.to = repack.qty.to
              return this.snackbar.show(`Cannot set repack qty to be more than qty orginally repacked, ${repack.qty.to+excess.qty.to+qtyChange}`)
            }

            this.db.transaction.put(excess)
            return this.saveTransaction(transaction)
        })
      })
    })
  }

  setRepackRows(repack, $last, $index) {

    console.log('setRepackRows', repack, $index, $last, this.repacks.length)

    //Last repack is the only empty one.  Remove any others that are empty
    if ( ! $last && ! repack.qty) {
      this.repacks.splice($index, 1)
      this.menu.resize() //Recalculate menu height
    }

    //If user fills in last repack then add another for them copying over exp and bin
    if ($last && repack.qty) {
      this.repacks.push({})
      this.menu.resize() //Recalculate menu height

      //If qty is set on last row, then fill in exp and bin automatically using the previous rows info
      if ( ! repack.exp)
        repack.exp = this.repacks[$index-1].exp

      if ( ! repack.bin)
        repack.bin = this.repacks[$index-1].bin
    }

    //Recalculate total
    this.setExcessQty()
  }

  setRepackQty() {
    let qtyInPendId  = this.getPendQty() || 30*Math.floor(this.filter.checked.qty/30) //default to rounding nearest 30
    let qtyRemainder = this.filter.checked.qty - qtyInPendId
    qtyInPendId  && this.repacks.push({exp:this.repacks.exp, qty:qtyInPendId})
    qtyRemainder && this.repacks.push({exp:this.repacks.exp, qty:qtyRemainder})
  }

  setExcessQty() {
    let repackQty = this.repacks.reduce((totalQty, repack) => {
      //console.log('setExcessQty', totalQty, repack.qty, repack)
      return Math.max(0, repack.qty || 0) + totalQty // default to 0 for the empty repack row otherwise undefined makes everything become NaN
    }, 0)
    this.repacks.excessQty = this.filter.checked.qty - repackQty
    //console.log('this.repacks.excessQty', this.repacks.excessQty, this.filter.checked.qty, repackQty, this.repacks)
  }

  exportCSV() {

    let [year, month, day] = this.currentDate(-1, true)
    let name = `Inventory ${year}-${month}-${day}.csv`
    let opts = {
      reduce:false,
      startkey:[this.account._id, 'month', year, month],
      endkey:[this.account._id, 'month', year, month+'\uffff']
    }

    this.db.transaction.query('inventory-by-generic', opts).then(transactions => {
      this.csv.fromJSON(name, transactions.rows.map(row => {
        return {
          'drug.generic':row.key[4],
          'drug.gsns':row.key[5],
          'drug.brand':row.key[6],
          'drug._id':row.key[7],
          'exp.to':row.key[8],
          'qty.to':row.value[0],
          'val.to':row.value[1],
          'bin':row.key[10], //key 9 is sortedBin
          '_id':row.id
        }
      }))
    })
  }

  openMenu($event) {
    console.log('openMenu called', $event.target.tagName, this.transactions.length, ! this.transactions.length, this.repacks, $event)

    //This repack.length because Pradaxa (2019-01-28T20:23:27.174900Z & 2019-01-28T16:47:12.754500Z) got the next.transaction of Esomeprazole (2019-01-29T17:15:56.773700Z)
    if (this.repacks.length && $event.target.tagName != 'I' && $event.target.tagName != 'BUTTON' && $event.target.tagName != 'UL' && $event.target.tagName != 'MD-MENU')
      return true //only calculate for the parent element, <i vertical menu icon>, and not children //true needed so public inventory link works

    if ( ! this.transactions.length) {
      console.log('openMenu transactions.length == 0', this.repacks)
      return true
    }

    const term = this.term.replace('Pended ', '')

    this.pendToId  = ''
    this.pendToQty = ''
    this.basketNumber = ''
    this.repacks   = this.setRepacks()
    this.matches   = this.setMatchingPends(this.repacks.drug)

    if (this.repacks.drug) {
      this.setRepackQty()
      this.setExcessQty()
    }

    console.log('openMenu', this.account.ordered[this.term], this.repacks)
  }

  setMatchingPends(drug) {

    let matches = []
    let pendId  = this.getPendId()

    if (drug)
      for (let pendToId in this.pended) {
        let match = this.pended[pendToId][drug.generic]
        if (pendId != pendToId && match)
          matches.push({pendId:pendToId, pendQty:this.getPendQty(match.transactions[0])})
      }
    return matches
  }

  setRepacks() {
    let repacks = []
    repacks.exp    = '' //hacky but effective to set properties to array here
    repacks.drug = null
    //Filter Selected and then two reduces, one for drug, one for exp.
    //1) If all same drug then repacks.drug is the generic name, otherwise dscsa_default_post_value
    //2) Repacks.exp is the minimum expiration date of the transactions selected
    for (let transaction of this.transactions) {

      if ( ! transaction.isChecked) continue

      if (repacks.drug == null) { //null or undefined but not false
        repacks.drug = JSON.parse(JSON.stringify(transaction.drug))
        repacks.drug.price = {goodrx:0, nadac:0, retail:0, updatedAt:new Date().toJSON()} //need to do a weighted average price of everything being repacked
        console.log('this.repacks.drug is null', repacks.drug)
      } else if (repacks.drug._id != transaction.drug._id) {//Can only repack drugs with same NDC.  TODO Show Error?
        console.error('this.repacks.drug mismatch', repacks.drug, transaction.drug)
        repacks.drug = false
        this.snackbar.show(`Warning: Mismatched NDCs`)
        break
      }

      //Need to do a weighted average of prices (not just first/last transaction price), otherwise inventory.value in reports can change just because 2+ transactions are repacked into one
      repacks.drug.price.goodrx += transaction.drug.price.goodrx * transaction.qty.to / this.filter.checked.qty
      repacks.drug.price.nadac  += transaction.drug.price.nadac  * transaction.qty.to / this.filter.checked.qty
      repacks.drug.price.retail += transaction.drug.price.retail * transaction.qty.to / this.filter.checked.qty
      console.log('setRepacks weighted price', repacks.drug.price.goodrx, transaction.drug.price.goodrx, transaction.qty.to, this.filter.checked.qty)

      repacks.exp = repacks.exp && repacks.exp < transaction.exp.to
        ? repacks.exp
        : transaction.exp.to
    }

    return repacks
  }

  //Split functionality into Keydown and Input listeners because (keydown is set in constructor)
  //Don't put this code into input because enter (which == 13) does not trigger input event.
  //Don't put input code here because would then need a setTimeout for the quantity to actually change
  //and you would need to ignore non-input key values.  So it cleaner to just keep these listeners separate
  qtyShortcutsInput($event, $index) {
    //Only run autocheck if the transaction was not deleted
    this.removeTransactionIfQty0($event, $index)
  }

  binShortcuts($event, $index) {
    if ($event.which == 13) //Enter should focus on next row's exp
      this.focusInput(`#exp_${$index+1}`)
    else
      this.incrementBin($event, this.transactions[$index])

    return true
  }

  showHistoryDialog(_id) {
    console.log('getHistory', _id)
    this.history     = 'Loading...'
    this.dialog.showModal()
    this.getHistory(_id).then(history => {
      console.log(history)
      this.history = history
    })
  }

  closeHistoryDialog() {
    this.dialog.close()
  }
}

//ADDED step of converting object to array
export class inventoryFilterValueConverter {
  toView(transactions = [], filter = {}, term = ''){
    //restart filter on transaction changes but keep checks
    //where they are if user is just modifying the filter
    let ndcFilter       = {}
    let expFilter       = {}
    let repackFilter    = {}
    let formFilter      = {}
    let checkVisible    = true
    let oneMonthFromNow = currentDate(1)
    let isBin           = inventory.prototype.isBin(term)
    let defaultCheck    = isBin || inventory.prototype.isExp(term)

    filter.checked = filter.checked || {}
    filter.checked.qty = filter.checked.qty || 0
    filter.checked.count = filter.checked.count || 0

    transactions = transactions.filter((transaction, i) => {

      //TODO we could reduce code by making this a loop of keys.  Lot's of redundancy here
      let qty    = transaction.qty.to || transaction.qty.from
      let exp    = (transaction.exp.to || transaction.exp.from || oneMonthFromNow).slice(0, 7) //using onemonthfromnow is here for the transactions that are showing up double-null in expiration date. this ay the field will be empty, but the order/group/generic will still display
      let ndc    = transaction.drug._id
      let form   = transaction.drug.form
      let repack = inventory.prototype.isRepack(transaction) ? 'Repacked' : 'Inventory'
      let isExp  = exp > oneMonthFromNow ? 'Unexpired' : 'Expired'
      let pended = transaction.next[0] && transaction.next[0].pended

      if ( ! expFilter[exp]) {
        //console.log('pended', !!pended, 'exp', exp, 'filter.exp', filter.exp, 'filter.exp[exp]', filter.exp && filter.exp[exp], 'filter.exp[exp].isChecked', filter.exp && filter.exp[exp] && filter.exp[exp].isChecked)
        expFilter[exp] = {isChecked:filter.exp && filter.exp[exp] ? filter.exp[exp].isChecked : defaultCheck || pended || false, count:0, qty:0}
      }

      if ( ! expFilter[isExp]) {
        expFilter[isExp] = {isChecked:filter.exp && filter.exp[isExp] ? filter.exp[isExp].isChecked : ((isBin && isExp == 'Unexpired' && term[3] == '*') ? false : true), count:0, qty:0} //if someone search for 'A00*' show only the expired items by default (this will help data entry people purging expireds)
      }

      if ( ! ndcFilter[ndc])
        ndcFilter[ndc] = {isChecked:filter.ndc && filter.ndc[ndc] ? filter.ndc[ndc].isChecked : defaultCheck || pended || ! i, count:0, qty:0}

      if ( ! formFilter[form])
        formFilter[form] = {isChecked:filter.form && filter.form[form] ? filter.form[form].isChecked : defaultCheck || pended || ! i, count:0, qty:0}

      if ( ! repackFilter[repack])
        repackFilter[repack] = {isChecked:filter.repack && filter.repack[repack] ? filter.repack[repack].isChecked : defaultCheck || pended || ! repackFilter['Repacked'], count:0, qty:0}

      if ( ! expFilter[isExp].isChecked) {
        if (expFilter[exp].isChecked && ndcFilter[ndc].isChecked && formFilter[form].isChecked && repackFilter[repack].isChecked) {
          expFilter[isExp].count++
          expFilter[isExp].qty += qty
        }

        return inventory.prototype.setCheck.call({filter}, transaction, false)
      }

      if ( ! expFilter[exp].isChecked) {
        if (expFilter[isExp].isChecked && ndcFilter[ndc].isChecked && formFilter[form].isChecked && repackFilter[repack].isChecked) {
          expFilter[exp].count++
          expFilter[exp].qty += qty
        }

        return inventory.prototype.setCheck.call({filter}, transaction, false)
      }

      if ( ! ndcFilter[ndc].isChecked) {
        if (expFilter[isExp].isChecked && expFilter[exp].isChecked && formFilter[form].isChecked && repackFilter[repack].isChecked) {
          ndcFilter[ndc].count++
          ndcFilter[ndc].qty += qty
        }

        return inventory.prototype.setCheck.call({filter}, transaction, false)
      }

      if ( ! formFilter[form].isChecked) {
        if (expFilter[isExp].isChecked && expFilter[exp].isChecked && ndcFilter[ndc].isChecked && repackFilter[repack].isChecked) {
          formFilter[form].count++
          formFilter[form].qty += qty
        }
        return inventory.prototype.setCheck.call({filter}, transaction, false)
      }

      if ( ! repackFilter[repack].isChecked) {
        if (expFilter[isExp].isChecked && expFilter[exp].isChecked && ndcFilter[ndc].isChecked && formFilter[form].isChecked) {
          repackFilter[repack].count++
          repackFilter[repack].qty += qty
        }

        return inventory.prototype.setCheck.call({filter}, transaction, false)
      }

      if ( ! transaction.isChecked)
        checkVisible = false

      expFilter[isExp].count++
      expFilter[isExp].qty += qty

      expFilter[exp].count++
      expFilter[exp].qty += qty

      ndcFilter[ndc].count++
      ndcFilter[ndc].qty += qty

      formFilter[form].count++
      formFilter[form].qty += qty

      repackFilter[repack].count++
      repackFilter[repack].qty += qty

      return true
    })

    filter.exp     = expFilter
    filter.ndc     = ndcFilter
    filter.form    = formFilter
    filter.repack  = repackFilter
    filter.checked.visible = transactions.length ? checkVisible : false //unchecked if not transactions

    return transactions
  }
}

//Allow user to search by pendId OR generic name OR picked bin
export class pendedFilterValueConverter {
  toView(pended = {}, term = ''){
    term = term.toLowerCase()
    let matches = [] //an array of arrays
    for (let pendId in pended) {
      if ( ~ pendId.toLowerCase().indexOf(term)) {
        matches.unshift({key:pendId, val:pended[pendId]})
        continue
      }

      //search by basket

      let basketMatches = {}

      for(let generic in pended[pendId]){
        let transactions = pended[pendId][generic].transactions
        for(var i = 0; i < transactions.length; i++){
          if(transactions[i].next[0].picked && transactions[i].next[0].picked.basket && ~ transactions[i].next[0].picked.basket.toLowerCase().indexOf(term)){
            basketMatches[generic] = pended[pendId][generic]
          }
        }
      }

      if (Object.keys(basketMatches).length)
        matches.unshift({key:pendId, val:basketMatches})

        //search by generic

      let genericMatches = {}

      for (let generic in pended[pendId])
        if ( ~ generic.toLowerCase().indexOf(term))
          genericMatches[generic] = pended[pendId][generic]

      if (Object.keys(genericMatches).length)
        matches.unshift({key:pendId, val:genericMatches})
    }

    return matches
  }
}
