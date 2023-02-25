const fs = require('fs')
const DATAPATH = 'standard-data'

const dataReader = {}
const dataHolder = {
  userData: [],
  userIdData: [],
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
        // console.log('read users from file...')
        dataHolder.userData = JSON.parse(data, (key, value) => {
          if (key === 'userId') {
            return parseInt(value)
          }
          return value
        })
        resolve(dataHolder.userData)
      })
    } else {
      // console.log('load users from obj...')
      resolve(dataHolder.userData)
    }
  })
}

dataReader.getAllUsersId = async () => {
  return new Promise((resolve, reject) => {
    if (!dataHolder.userIdData.length > 0) {
      fs.readFile(`./data/${DATAPATH}/users.json`, 'utf8', (err, data) => {
        if (err) {
          reject(err)
        }
        // console.log('read users from file...')
        JSON.parse(data, (key, value) => {
          // console.log(key, value)
          if (key === 'userId') {
            dataHolder.userIdData.push({ userId: parseInt(value) })
          }
        })

        resolve(dataHolder.userIdData)
      })
    } else {
      resolve(dataHolder.userIdData)
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
        //resolve(dataHolder.ratingsData)
        resolve(JSON.parse(JSON.stringify(dataHolder.ratingsData)))
      })
    } else {
      // console.log('load ratings from obj...')
      resolve(dataHolder.ratingsData)
      //resolve(JSON.parse(JSON.stringify(dataHolder.ratingsData)))
    }
  })
}

dataReader.getMovies = async () => {
  return new Promise((resolve, reject) => {
    if (!dataHolder.movieData.length > 0) {
      // console.log('read movies from file...')
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

        //resolve(dataHolder.movieData)
        resolve(JSON.parse(JSON.stringify(dataHolder.movieData)))
      })
    } else {
      // console.log('load movies frm obj...')
      resolve(dataHolder.movieData)
      //resolve(JSON.parse(JSON.stringify(dataHolder.movieData)))
    }
  })
}

module.exports = dataReader
