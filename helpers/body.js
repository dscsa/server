"use strict"

let csv = require('csv/server')

module.exports = function(stream) {

  if (stream.body) //maybe this stream has already been collected.
    return Promise.resolve(stream.body)

  if (typeof stream.on != 'function') //ducktyping http://stackoverflow.com/questions/23885095/nodejs-check-if-variable-is-readable-stream
    throw 'http.json was not given a stream'

  if ( ! stream.readable)
    throw 'http.json stream is already closed'

  stream.body = ''
  return new Promise((resolve, reject) => {
    stream.on('error', err => reject(err))
    stream.on('data', data => stream.body += data)
    stream.on('end', _ => {

        if (stream.url && stream.url.endsWith('.csv')) {
          try {
            stream.body = csv.toJSON(stream.body)
          } catch (err) {
            reject('Error: Invalid CSV\n'+err.stack+'\n'+stream.body)
          }
        }
        else {//default to {} this is what other body parsers do in strict mode.  Not sure what we want to do here.
          try {
            stream.body = csv.parseJSON(stream.body, {})
          } catch (err) {
            console.error(new Date().toJSON(), 'body.js parseJSON error', stream.url, stream.headers, stream)
            reject('Error: Invalid JSON\\n'+err.stack+'\\n'+stream.body)
          }
        }
        resolve(stream.body)
    })
  })
}
