'use strict'
const fs = require('fs')
const DATAPATH = 'standard-data'

const dataHolder = {
  userData: [],
}

const jsonData = {}

jsonData.getUserData = async () => {
  return new Promise((resolve, reject) => {
    if (!dataHolder.userData.length > 0) {
      fs.readFile(`./data/${DATAPATH}/users.json`, 'utf8', (err, data) => {
        if (err) {
          reject(err)
        }
        dataHolder.userData = JSON.parse(data, (key, value) => {
          if (key === 'userId') {
            return parseInt(value)
          }
          return value
        })
        resolve(dataHolder.userData)
      })
    } else {
      resolve(dataHolder.userData)
    }
  })
}

module.exports = jsonData
