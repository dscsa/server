"use strict"

let fs = require('fs')

//Consumed by server/index.js and development/aurelia_project/tasks/run.js
module.exports = function keys(done) {

  try {
    console.log('Checking key directory: '+__dirname+'/../../../keys/dev.js')
    fs.accessSync(__dirname+'/../../../keys/dev.js')
    done()
  } catch(e) {
    console.log('Error: Missing Key File! Please create to continue')
  }
}
