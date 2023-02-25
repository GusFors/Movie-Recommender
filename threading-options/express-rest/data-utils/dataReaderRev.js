const fs = require('fs')
const DATAPATH = 'standard-data'

const dataReader = {}
const dataHolder = {
  userData: [],
  ratingsData: [],
  movieData: [],
}

dataReader.getAllUsers = async () => {
  return new Promise((resolve, reject) => {
    if (!dataHolder.userData.length > 0) {
      fs.readFile(`./data/${DATAPATH}/users.json`, 'utf8', (err, data) => {
        if (err) {
          reject(err)
        }
        console.log('read users from file...')
        dataHolder.userData = JSON.parse(data, (key, value) => {
          if (key === 'userId') {
            return parseInt(value)
          }

          return value
        })
        resolve(dataHolder.userData)
      })
    } else {
      console.log('load users from obj...')
      resolve(dataHolder.userData)
    }
  })
}

dataReader.getRatings = async () => {
  return new Promise((resolve, reject) => {
    if (!dataHolder.ratingsData.length > 0) {
      fs.readFile(`./data/${DATAPATH}/ratings.json`, 'utf8', (err, data) => {
        if (err) {
          reject(err)
        }
        console.log('read rating from file...')
        dataHolder.ratingsData = JSON.parse(data, (key, value) => {
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
        resolve(dataHolder.ratingsData)
      })
    } else {
      console.log('load ratings from obj...')
      resolve(dataHolder.ratingsData)
    }
  })
}

dataReader.getMovies = async () => {
  return new Promise((resolve, reject) => {
    if (!dataHolder.movieData.length > 0) {
      console.log('read movies from file...')
      fs.readFile(`./data/${DATAPATH}/movies.json`, 'utf8', (err, data) => {
        if (err) {
          reject(err)
        }
        dataHolder.movieData = JSON.parse(data, (key, value) => {
          if (key === 'movieId') {
            return parseInt(value)
          }
          return value
        })

        resolve(dataHolder.movieData)
      })
    } else {
      console.log('load movies frm obj...')
      resolve(dataHolder.movieData)
    }
  })
}

module.exports = dataReader
