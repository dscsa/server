 import {toJsonDate, parseUserDate} from '../resources/helpers'

//http://stackoverflow.com/questions/32017532/observe-property-on-an-array-of-objects-for-any-changes
export class jsonValueConverter {
  toView(object = null){
    return JSON.stringify(object, null, " ")
  }
}

export class numberValueConverter {
  fromView(str){
    return str === '' ? null : +str
  }
  toView(num, decimals){
    return num && decimals != null ? num.toFixed(decimals) : num
  }
}

export class upperCaseValueConverter {
  fromView(str) {
    return str == null ? null : str.toUpperCase()
  }
}

export class shipmentFilterValueConverter {
  toView(shipments = [], filter = ''){
    filter = filter.toLowerCase()
    return shipments.filter(shipment => {
      return ~ `${shipment.account.from.name} ${shipment.account.to.name} ${shipment.tracking} ${shipment.status} ${shipment._id && shipment._id.slice(0, 10)}`.toLowerCase().indexOf(filter)
    })
  }
}

export class drugFilterValueConverter {
  toView(drugs = [], filter = ''){
    filter = filter.replace('.', '\\.').split(/, |[, ]/g)
    var regex = RegExp('(?=.*'+filter.join(')(?=.*( |0)')+')', 'i') //Use lookaheads to search for each word separately (no order).  Even the first term might be the 2nd generic
    return drugs.filter(drug => regex.test(drug.generic))
  }
}

//TODO make this work with added items
export class userFilterValueConverter {
  toView(users = [], filter = ''){
    filter = filter.toLowerCase()
    let res = users.filter(user => {
      try {
        return ~ `${user.name.first} ${user.name.last}`.toLowerCase().indexOf(filter)
      }
      catch (err) {
        console.log('filter err', user, err)
      }
    })
    return res
  }
}

export class valueValueConverter {
  toView(transactions = [], decimals, trigger) {

    transactions = Array.isArray(transactions) ? transactions : [transactions]

    return transactions.reduce((total, transaction) => {
      if ( ! transaction.drug.price || ! transaction.qty) return 0
      let price = transaction.drug.price.goodrx || transaction.drug.price.nadac || 0
      let   qty = transaction.qty.to || transaction.qty.from || 0
      return total + qty * price
    }, 0).toFixed(decimals)
  }
}

export class boldValueConverter {
  toView(text, bold){
    if ( ! bold || ! text) return text

    if (typeof bold == 'string') //Handle a strength of 0.5mg and .5mg interchangeably
      bold = RegExp('('+bold.replace(/ /g, '|').replace('.', '( | 0)?\\.')+')', 'gi')

    return text.replace(bold, '<strong>$1</strong>')
  }
}

export class dateValueConverter {

  toView(date) {
    if ( ! date ) return ''
    return date != this.model ? date.slice(5,7)+'/'+date.slice(2,4) : this.view
  }

  fromView(date){

    if (date.includes('*'))
      return null

    let {month, year} = parseUserDate(date.replace(/\+|\-|\=/g, ''))

    if (date.includes('+') || date.includes('='))
      month++

    if(date.includes('-'))
      month--

    if (month < 1) {
      year--
      month = 12
    }

    if (month > 12) {
      year++
      month = 1
    }

    //Keep zero padding in front of the month which is lost when month changes
    this.view = date.length == 1 ? month : ("00"+month).slice(-2)+'/'+year

    return this.model = toJsonDate({month, year})
  }
}

export class toArrayValueConverter {
  toView(obj = {}, sort){

    let arr = Object.keys(obj)

    if (sort) arr.sort().reverse()

    return arr.map(key => {
      return {key, val:obj[key]}
    })
  }
}
