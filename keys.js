"use strict"

let fs      = require('fs')
let rl      = require('readline').createInterface({input:process.stdin, output:process.stdout})

//Consumed by server/index.js and development/aurelia_project/tasks/run.js
module.exports = function keys(done) {
  try {
    fs.accessSync(__dirname+'/../../keys/dev.js')
    done()
  } catch(e) {
    fs.mkdir(__dirname+'/../../keys', err => {
      rl.question(`What is the CouchDB admin username?`, username => {
        rl.question(`What is the CouchDB admin password?`, password => {
          fs.writeFileSync(__dirname+'/../../keys/dev.js', `exports.username = '${username}'\nexports.password = '${password}'`)
          rl.close()
          done()
        })
      })
    })
  }
}
