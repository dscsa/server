exports.toJSON = function(csv) {
  let rows   = csv2rows(csv)
  let header = rows.shift().split(',')
  return rows.map(row => flat2nested(header, row))
}

exports.fromJSON = function(rows, header) {

  let flat = rows.map(row => nested2flat(row2nested(row)))

  //If no fixed header, get union of the headers for every row
  //Reduced views have no _id so assign it the group's key instead
  if (typeof header == 'string')
    header = header.split(',')
  else if ( ! header)
    header = flat.reduce(flat2header, []).sort(sortGroupFirstKeysLast)

  //Collect and get union of all row headers
  //header.map() rectifies any potential differences in property ordering
  return flat.reduce((csv, row) => csv+'\n'+header.map(i => row[i]), header)
}

exports.parseJSON = function(json, backup) {
  try {
    return json ? JSON.parse(json) : backup
  } catch (e) {
    console.error(new Date().toJSON(), 'parseJSON error', 'backup', backup, 'json', json)
    return backup
  }
}

function sortGroupFirstKeysLast(a,b) {

  if (b == 'group') return 1
  if (a == 'group') return -1

  let aKey = a.slice(0,3) == 'key'
  let bKey = b.slice(0,3) == 'key'

  if (aKey && ! bKey) return 1
  if (bKey && ! aKey) return -1

  if (b<a) return 1
  if (a<b) return -1
}

function nested2flat(obj) {
  var flat = {}

  for (let i in obj) {

    if (obj[i] === null) {
      flat[i] = obj[i]; continue
    }

    if (typeof obj[i] != 'object' || obj[i] == null || Array.isArray(obj[i])) {
       flat[i] = escape(obj[i]); continue
    }

    let flatObject = nested2flat(obj[i])

    for (let j in flatObject) {
      flat[i+'.'+j] = flatObject[j]
    }
  }
  return flat
}

function flat2nested(header, row) {

  let res = {}, fields = row2fields(row)

  for (var i in header) {
    let arr = header[i].split('.')
    let curr = res

    for (let j in arr) {
      let key = arr[j]

      if (j < arr.length - 1) {
        curr = curr[key] = curr[key] || {}; continue
      }

      curr[key] = fields[i] || null
    }
  }
  return res
}

 //split on line breaks, slice out multipart boundaries and headers
function csv2rows(csv) {
  //console.log('csv2rows')
  return csv.split(/\r\n|\n/) //.slice(4, -2) slice was necessary when using FormData which passed multipart boundary headers
}

//https://stackoverflow.com/questions/1757065/java-splitting-a-comma-separated-string-but-ignoring-commas-in-quotes
function row2fields(row) {
  //console.log('row2fields')
  return row.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(unescape) ///,(?=,|"[^,"])/
}

function row2nested(row) {
  //console.log('row2nested')
  if (row.doc) return row.doc

  if (typeof row.value != 'object')
    row.value = {value:row.value}

  if ( ! row.key) return row.value

  //Assign keys as both array and as flattened object since both are helpful in gsheets
  //Use Object.assign() to put first in property order
  //Remove 1st element: to_id which is only used as authorization, and 2nd element which is the date grouping ''/year/month/day
  row.value = Object.assign({key:row.key.slice(2)}, row.value)

  return row.key.slice(2).reduce(array2object, row.value)
}

function array2object(o, val, i) {
  return Object.assign(o, {['key.'+i]: val})
}

function escape(str) {

  if (typeof str == 'number' || str == null || str === true || str === false)
    return str

  if (Array.isArray(str))
    str = JSON.stringify(str)

  if (str.startsWith("0")) //excel gets rid of leading 0s unless you have a tab \t or apotrophe
    str = "'"+str

  if (/^[\d,]+$/.test(str)) //excel gets rid of comma in GSN list 43555,45666 because thinks its an ill-formed number
    str = "'"+str

  if (str.includes(',') || str.includes('"'))   //escape any commas in the field by surronding with quotes.  Excel seems to escape brackets as well
    str = wrapQuotes(str)

  return str
}

function wrapQuotes(str) {
  return '"'+str.replace(/"/g, '""')+'"' //csv spec says to escape a " with another "
}

//'"[""adam"":""kircher""]"' --> '["adam":"kircher"]'
function unwrapQuotes(str) {
  return str.slice(1, -1).replace(/""/g, '"')
}

function unescape(str) {

  if (str == null)
    return undefined

  if (str.length != 10 && Number(str) == str) //don't include phone numbers
    return Number(str)

  if (str.startsWith("'0")) //excel gets rid of leading 0s unless you have a tab \t or apotrophe
    str = str.slice(1)

  if (/^'[\d,]+$/.test(str)) //excel gets rid of comma in GSN list 43555,45666 because thinks its an ill-formed number
      str = str.slice(1)

  if (str.startsWith('"') && str.endsWith('"'))
    str = unwrapQuotes(str)

  if (str.startsWith('[') && str.endsWith(']'))
    str = exports.parseJSON(str)

  return str
}

function flat2header(header, row) {
  //console.log('flat2header', header, row)
  let newFields = Object.keys(row).filter(field => field != null && ! header.includes(field))
  return header.concat(newFields)
}
