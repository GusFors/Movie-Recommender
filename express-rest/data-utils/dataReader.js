const fs = require('fs')
const DATAPATH = 'standard-data'

const dataReader = {}

dataReader.getAllUsers = async () => {
  return new Promise((resolve, reject) => {
    fs.readFile(`./data/${DATAPATH}/users.json`, 'utf8', (err, data) => {
      if (err) {
        reject(err)
      }
      resolve(JSON.parse(data))
    })
  })
}

dataReader.getRatings = async () => {
  return new Promise((resolve, reject) => {
    fs.readFile(`./data/${DATAPATH}/ratings.json`, 'utf8', (err, data) => {
      if (err) {
        reject(err)
      }
      resolve(JSON.parse(data))
    })
  })
}

dataReader.getMovies = async () => {
  return new Promise((resolve, reject) => {
    fs.readFile(`./data/${DATAPATH}/movies.json`, 'utf8', (err, data) => {
      if (err) {
        reject(err)
      }
      resolve(JSON.parse(data))
    })
  })
}

module.exports = dataReader
