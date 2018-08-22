"use strict"

let fs = require('fs')

//Consumed by server/index.js and development/aurelia_project/tasks/run.js
module.exports = function keys(done) {

  try {
    console.log('Checking key directory: '+__dirname+'/../../../keys/dev.js')
    fs.accessSync(__dirname+'/../../../keys/dev.js')
    done()
  } catch(e) {
    let rl = require('readline').createInterface({input:process.stdin, output:process.stdout})
    fs.mkdir(__dirname+'/../../../keys', err => {
      rl.question(`What is the CouchDB admin username?`, username => {
        rl.question(`What is the CouchDB admin password?`, password => {
          fs.writeFileSync(__dirname+'/../../../keys/dev.js', `exports.username = '${username}'\nexports.password = '${password}'`)
          rl.close()
          done()
        })
      })
    })
  }
}
