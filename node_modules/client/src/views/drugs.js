import {inject} from 'aurelia-framework'
import {Router} from 'aurelia-router'
import {Pouch}     from '../libs/pouch'
import {csv}    from '../libs/csv'
import {canActivate, scrollSelect, toggleDrawer, drugSearch, drugName, groupDrugs, focusInput, currentDate} from '../resources/helpers'


//@pageState()
@inject(Pouch, Router)
export class drugs {
  constructor(db, router){
    this.csv    = csv
    this.db     = db
    this.router = router
    this.term   = ''
    this.scrollDrugs = this.scrollDrugs.bind(this)

    this.toggleDrawer = toggleDrawer
    this.scrollSelect = scrollSelect
    this.drugSearch   = drugSearch
    this.groupDrugs   = groupDrugs
    this.focusInput   = focusInput
    this.drugName     = drugName
    this.canActivate  = canActivate
    this.currentDate  = currentDate
  }

  deactivate() {
    removeEventListener('keyup', this.scrollDrugs)
  }

  activate(params) {

    addEventListener('keyup', this.scrollDrugs)
    return this.db.user.session.get()
    .then(session => {
      return this.db.account.get(session.account._id)
    })
    .then(account => {
      this.account = account
      this.drawer  = {
        ordered:Object.keys(this.account.ordered).sort()
      }
      if (params.id)
        return this.db.drug.get(params.id).then(drug => {
          this.selectDrug(drug, true)
        })

      if (this.drawer.ordered[0])
        return this.selectDrawer(this.drawer.ordered[0])

      return this.selectDrug()
    })
    .catch(err => {
      console.error('Could not get session for user.  Please verify user registration and login are functioning properly')
    })

  }

  scrollGroups($event) {
    Promise.resolve(this._search).then(_ => {
      //group won't be a reference so we must search manually
      this.scrollSelect($event, this.group, this.groups, group => this.selectGroup(group, true))

      if ($event.which == 13)//Enter get rid of the results
        this.selectGroup(null, true)
    })

    $event.stopPropagation() //scrolling groups doesn't need to scroll drugs as well
  }

  scrollDrugs($event) {
    this.group && this.scrollSelect($event, this.drug, this.group.drugs, this.selectDrug)
  }

  addDays(days) {
    let date  = new Date()
    date.setDate(+days + date.getDate())
    return (days ? date : new Date()).toJSON().slice(0, 10) //because the days field can be null if account doesnt have default property set
  }

  //Four entrances.
  //1a) User searches and then selects group from autocomplete (group already supplied)
  //1b) User scrolls through search results
  //2) selectDrawer and we need to find the group with that particular generic name
  //3) selectDrug and we need to find the group with that particular generic name
  selectGroup(group, autoselectDrug) {
    console.log('selectGroup()', group, this.drug && this.drug.generic)

    this.term     = group.generic

    let order     = this.account.ordered[group.generic] || {}
    let minDays   = order.minDays || (this.account.default && this.account.default.minDays)
    let indate    = this.addDays(minDays).split('-')
    let unexpired = this.currentDate(1, true)

    //[to_id, 'month', year, month, doc.drug.generic, stage, sortedDrug]
    this.db.transaction.query('inventory-by-generic', {startkey:[this.account._id, 'month', indate[0], indate[1], group.generic], endkey:[this.account._id, 'month', indate[0], indate[1], group.generic, {}]})
    .then(inventory => {
      console.log('indate inventory', minDays, indate, inventory)
      let row = inventory.rows[0]
      this.indateInventory = row ? row.value[0].sum : 0
      console.log('indate inventory', this.indateInventory)

      this.db.transaction.query('inventory-by-generic', {startkey:[this.account._id, 'month', unexpired[0], unexpired[1], group.generic], endkey:[this.account._id, 'month', unexpired[0], unexpired[1], group.generic, {}]})
      .then(inventory => {
        console.log('outdate inventory', unexpired, inventory)
        let row = inventory.rows[0]
        this.outdateInventory = row ? row.value[0].sum - this.indateInventory: 0
        console.log('outdate inventory', this.outdateInventory)
      })
    })

    if ( ! group.drugs) //Not set if called from selectDrug or selectDrawer
      group.drugs = this.search().then(_ => {
        //Use filter to get an exact match not just one ingredient
        let filtered = this.groups.filter(group => {
          console.log('Filtering drug seach for exact results', this.term, group.generic, group)
          return this.term == group.generic
        })
        return filtered.length ? filtered[0].drugs : []
      })

    Promise.resolve(group.drugs).then(drugs => {
      group.drugs = drugs
      this.group  = group

      //TODO if this was called by selectDrug then we should establish establish a reference
      //between the approriate this.group.drugs and this.drug so that changes to the drug
      //appear in realtime on the right hand side.  This works if selectGroup
      if (autoselectDrug)
        this.selectDrug(group.drugs[0])
    })
  }

  selectDrug(drug, autoselectGroup) {
    //Default is for Add Drug menu item in view
    console.log('selectDrug()', this.group && this.group.name, this.group && this.group.generic, this.drug, drug)

    let url
    ///Drug is not set if we are adding a new drug
    if (drug) {
      this.drug = drug
      url = 'drugs/'+this.drug._id
    } else {
      this.drug = {
        generics:(this.drug && this.drug.generics) || [], //keep default strenght from showing up as "undefined"
        form:this.drug && this.drug.form,
        brand:this.drug && this.drug.brand,
        gsns:this.drug && this.drug.gsns,
      }
      url = 'drugs'

      //save time when entering new drugs.  Wait because field is disabled right now and will take a bit to enable.
      setTimeout(_ => {
        this.focusInput('[name=pro_ndc_field]')
      }, 100)

    }

    //If needed, add blank row so user can add more ingredients
    this.setGenericRows(this.drug.generics.slice(-1)[0], 0, true)
    this.router.navigate(url, { trigger: false })

    if (autoselectGroup)
      this.selectGroup({generic:this.drug.generic})
  }

  selectDrawer(generic) {
    this.selectGroup({generic}, true)
    this.toggleDrawer()
  }

  search() {
    return this.drugSearch().then(drugs => {
      this.groups = this.groupDrugs(drugs, this.account.ordered)
      console.log('drugs.js search()', drugs.length, this.groups.length, this.groups)
    })
  }

  markHazard(){

    if(!this.account.hazards) this.account.hazards = {}

    if(this.account.hazards[this.group.generic]){
      this.account.hazards[this.group.generic] = undefined       //then remove it from the list
    } else {
      this.account.hazards[this.group.generic] = {"message":"warning"}
    }

    this.saveAccount();
  }

  //We might make a separate database and API out of this one day, but for now just save on account object.
  //TODO: Warn on delete since we won't save save any of the preferences?
  order() {
    console.log('before order()', this.group.generic, this.drug.generic)

    if (this.account.ordered[this.group.generic]) {
      //Delete this group from the drawer drawer
      this.drawer.ordered = this.drawer.ordered.filter(generic => {
        return generic != this.group.generic
      })

      this.account.ordered[this.group.generic] = undefined
    } else {
      //Add New Order but Keep Add New Item on Top
      this.drawer.ordered.unshift(this.group.generic)
      this.account.ordered[this.group.generic] = {}
    }
    console.log('after order()', this.group.generic, this.drug.generic)
    this.saveAccount()
  }

  exportCSV(generic) {
    let inventory = this.db.transaction.query('inventory-by-generic', {key:[this.account._id]})
    let drugs = this.db.drug.allDocs({include_docs:true, endkey:'_design'})
    Promise.all([inventory, drugs]).then(([inventory, drugs]) => {
      console.log('Export queries run')
      let ndcMap = {}
      for (const row of inventory.rows) {
        ndcMap[row.key[2]] = row.value[0]
      }
      console.log('Inital map complete')
      this.csv.fromJSON(`Drugs ${new Date().toJSON()}.csv`, drugs.rows.map(row => {
        return {
          order:this.account.ordered[row.doc.generic],
          '':row.doc,
          upc:"UPC "+row.doc.upc,
          ndc9:"NDC9 "+row.doc.ndc9,
          generics:row.doc.generics.map(generic => generic.name+" "+generic.strength).join(';'),
          inventory:ndcMap[row.doc._id]
        }
      }))
    })
  }

  importCSV() {
    this.snackbar.show(`Parsing csv file`)
    function capitalize(text) {
      return text ? text.trim().toLowerCase().replace(/\b[a-z]/g, l => l.toUpperCase()) : text
    }
    function trim(text) {
      return text ? text.trim() : text
    }

    this.csv.toJSON(this.$file.files[0], drugs => {
      this.$file.value = ''
      let errs  = []
      let chain = Promise.resolve()

      for (let i in drugs) {
        chain = chain

        .then(_ => {
          let drug = drugs[i]

          if("add_warning" in drug){ //So we're updating warning messages (probably to handle recalls)

            console.log("Updating drug warning messages")
            this.snackbar.show("Updating warning messages")

            this.db.drug.get(drug._id).then(drugs_found => {
              let item = drugs_found
              console.log("Drug found: " + item.generics[0].name + " " + item.generics[0].strength + ", NDC: " + item.ndc9)

              if("warning" in item){ //if there's already a warning, prepend this to it.
                item.warning =  drug.add_warning + "; " + item.warning
              } else {
                item.warning = drug.add_warning
              }

              return this.db.drug.post(item) //then update the DB for this item
              .then(_ =>{
                console.log("Message saved")
              })
              .catch(err =>{
                console.log("ERROR UPDATING MESSAGE:" + JSON.stringify(err))
              })
            })
            .catch(err =>{
              console.log("Drug not found: " + JSON.stringify(err))
            })

          } else { //Otherwise, it's just that we're importing drugs, this is the original simple adding code
            drug = {
              _id:trim(drug._id),
              brand:trim(drug.brand),
              form:capitalize(drug.form),
              image:trim(drug.image),
              labeler:capitalize(drug.labeler),
              generics:drug.generics.split(";").filter(v => v).map(generic => {
                let [name, strength] = generic.split(/(?= [\d.]+)/)
                return {
                  name:capitalize(name),
                  strength:trim(strength || '').toLowerCase().replace(/ /g, '')
                }
              }),
              price:drug.price
            }

            return this.db.drug.post(drug)
            .catch(err => {
              drug._err = 'Upload Error: '+JSON.stringify(err)
              errs.push(drug)
            })
            .then(_ => {
              if (+i && (i % 100 == 0))
                this.snackbar.show(`Imported ${i} of ${drugs.length}`)
              })
          }
        })
      }

      return chain.then(_ => errs)  //return something so we do download errors
    })
    .then(rows => this.snackbar.show('Import Succesful'))
    .catch(err => this.snackbar.error('Import Error', err))
  }

  setGenericRows(generic, $index, $last) {

    //If user fills in last repack then add another for them copying over exp and bin
    if ( ! generic || generic.name && $last)
      this.drug.generics.push({strength:''}) //keep default strenght from showing up as "undefined"

    //Last repack is the only empty one.  Remove any others that are empty
    if ( ! $last && ! generic.name && ! generic.strength) {
      this.drug.generics.splice($index, 1)
      setTimeout(_ => document.forms[0].dispatchEvent(new Event('change')))
    }
  }

  // addPkgSize() {
  //   this.drug.pkgs.push({code:'', size:''})
  //   return true
  // }
  //
  // removePkgSize() {
  //   this.drug.pkgs.pop()
  //   return true
  // }

  saveAccount() {
    return this.db.account.put(this.account).catch(_ => {
      console.log('after saveAccount()', this.group.generic, this.drug.generic)
      this.snackbar.show(`Error while saving: ${err.reason || err.message}`)
    })
  }

  showDefaultsDialog() {
    console.log('showDefaultsDialog')
    this.dialog.showModal()
  }

  closeDefaultsDialog() {
    this.dialog.close()
  }

  addDrug() {
    this._savingDrug = true

    //Don't save the extra generic row
    this.drug.generics.pop()

    this.db.drug.post(this.drug)
    .then(res => {
      this.drug._rev = res.rev
      this.selectDrug(this.drug, true)
      this._savingDrug = false
    })
    .catch(err => {
      this._savingDrug = false
      console.log(err)
      this.snackbar.show(`Drug not added: ${err.reason || err.message || JSON.stringify(err.errors)}`)
    })
  }

  saveDrug() {
    this._savingDrug = true

    //Don't save the extra generic row
    this.drug.generics.pop()

    this.db.drug.put(this.drug)
    .then(res => {
      //If we move the last drug out of the group, make sure we unorder it
      if (
        this.group.generic != this.drug.generic &&
        this.group.drugs.length == 1 &&
        this.account.ordered[this.group.generic]
      ) this.order()

      //Wait for the server PUT to replicate back to client
      this.selectDrug(this.drug, true)
      this._savingDrug = false
    })
    .catch(err => {
      this._savingDrug = false
      this.snackbar.show(`Drug not saved: ${err.reason || err.message}`)
    })
  }

  deleteDrug() {
    console.log('TO BE IMPLEMENETED')
    //TODO complicated since drug might be used in a transaction.  Switch trans to a new drug
  }
}
