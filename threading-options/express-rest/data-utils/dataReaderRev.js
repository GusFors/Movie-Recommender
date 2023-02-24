const fs = require('fs')
const DATAPATH = 'standard-data'

const dataReader = {}

dataReader.getAllUsers = async () => {
  return new Promise((resolve, reject) => {
    fs.readFile(`./data/${DATAPATH}/users.json`, 'utf8', (err, data) => {
      if (err) {
        reject(err)
      }
      resolve(
        JSON.parse(data, (key, value) => {
          if (key === 'userId') {
            return parseInt(value)
          }

          return value
        })
      )
    })
  })
}

dataReader.getRatings = async () => {
  return new Promise((resolve, reject) => {
    fs.readFile(`./data/${DATAPATH}/ratings.json`, 'utf8', (err, data) => {
      if (err) {
        reject(err)
      }
      resolve(
        JSON.parse(data, (key, value) => {
          if (key === 'userId') {
            return parseInt(value)
          }
          if (key === 'movieId') {
            return parseInt(value)
          }

          if (key === 'rating') {
            return parseFloat(value)
          }
          return value
        })
      )
    })
  })
}

dataReader.getMovies = async () => {
  return new Promise((resolve, reject) => {
    fs.readFile(`./data/${DATAPATH}/movies.json`, 'utf8', (err, data) => {
      if (err) {
        reject(err)
      }
      resolve(
        JSON.parse(data, (key, value) => {
          if (key === 'movieId') {
            return parseInt(value)
          }
          return value
        })
      )
    })
  })
}

module.exports = dataReader
