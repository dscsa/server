

function flat2nested(obj) {
    var res = {}
    for (var path in obj) {
        arr = path.split('.')
        curr = res
        for (var i in arr) {
            var key = arr[i]
            if (i < arr.length - 1) {
                curr = curr[key] = curr[key] || {}; continue
            }
            if (typeof obj[path] == 'string')
                obj[path] = obj[path].trim()

            curr[key] = obj[path] || null
        }
    }
    return res
}

var nested2flat = function (obj) {
    var flat = {}
    for (var i in obj) {
        if (obj[i] === null || typeof obj[i] != 'object') {
            flat[i] = obj[i]; continue
        }
        var flatObject = nested2flat(obj[i])
        var delimited = i && !Array.isArray(obj)
        for (var j in flatObject) {

            key = delimited ? i + '.' + j : j

            flat[key]
                ? flat[key] += ';' + flatObject[j]
                : flat[key] = flatObject[j]
        }
    }
    return flat
}

function sort(unsorted) {
  var sorted = {}
  Object.keys(unsorted).sort().forEach(key => sorted[key] = unsorted[key])
  return sorted
}

function parse(file, rows) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            preview: rows,
            complete: function (results, file) {
                resolve(results)
            },
            error: function (err, file) {
                console.log("error encountered when parsing", err);
            }
        })
    })
}

function toJSON(file, callback) {
  return parse(file, 0)
  .then(results => {
    results = results.data.map(row => flat2nested(row))
    return callback && callback(results.reverse())
  })
  .then(rows => fromJSON('Error '+file.name, rows))
  .then(_ => {        //in this case make user catch the value
    throw Error('Callback Returned Rows For Download')
  }, _ => undefined)  //in this case no rows is most likely a good thing: no errors for download
}

function fromJSON(name, rows) {

    if ( ! Array.isArray(rows)) throw Error('2nd argument must be an array')

    rows = rows.filter(row => row).map(row => sort(nested2flat(row)))

    if ( ! rows.length)
      throw Error('Array must have at least one value')

    let file = new Blob([Papa.unparse(rows)], {type:'text/csv;charset=utf-8;'})

    let link = document.createElement('a')
    link.href = window.URL.createObjectURL(file)
    link.setAttribute('download', name)
    link.click()
}
