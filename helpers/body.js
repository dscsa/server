"use strict"

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
      try {
         //default to {} this is what other body parsers do in strict mode.  Not sure what we want to do here.
        stream.body = JSON.parse(stream.body || '{}')
        resolve(stream.body)
      } catch (err) {
        reject('Error: Invalid JSON '+stream.body)
      }
    })
  })
}
