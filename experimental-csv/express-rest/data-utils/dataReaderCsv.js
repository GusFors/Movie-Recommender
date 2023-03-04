const fs = require('fs')
const { open } = require('node:fs/promises')
const DATAPATH = 'standard-data'
const readline = require('node:readline')
const dataReader = {}

const dataHolder = {
  userData: [],
  userIdData: [],
  ratingsData: [],
  movieData: [],
}

dataReader.getMoviesIdLineI = async () => {
  return new Promise((resolve, reject) => {
    let t1 = performance.now()

    const rl = readline.createInterface({
      input: fs.createReadStream(`./data/csv-data/small/movies.csv`),
      crlfDelay: Infinity,
    })
    let total = -1
    let cats
    let dataEntries = []
    let movieIds = []
    rl.on('line', function (line) {
      if (total === -1) {
        cats = line.split(',')
        total++
        return
      }
      movieIds[total] = parseInt(line.split(',')[0]) // after
      total++
    })
    rl.on('close', () => {
      let t2 = performance.now()
      console.log('done?', t2 - t1)
      console.log(total)
      console.log(dataEntries)
      console.log(movieIds)
    })
  })
}

dataReader.getUserIdLineI = async () => {
  return new Promise((resolve, reject) => {
    let t1 = performance.now()
    if (!dataHolder.userIdData.size > 0) {
      const rl = readline.createInterface({
        input: fs.createReadStream(`./data/csv-data/small/ratings.csv`),
        crlfDelay: Infinity,
      })
      let total = -1
      let cats
      let userIds = []
      let userIdSet = new Set()
      rl.on('line', function (line) {
        if (total === -1) {
          cats = line.split(',')
          total++
          return
        }

        // userIds[total] = parseInt(line[0]) // push faster?
        userIdSet.add(parseInt(line.split(',')[0])) // after
        total++
       
      })
      rl.on('close', () => {
        let t2 = performance.now()
        console.log('done?', t2 - t1)
        dataHolder.userIdData = userIdSet
        resolve([...dataHolder.userIdData])
      })
    } else {
      let t2 = performance.now()
      console.log('done?', t2 - t1)
      resolve([...dataHolder.userIdData])
    }
  })
}

dataReader.getRatingsLineI = async () => {
  return new Promise((resolve, reject) => {
    let t1 = performance.now()

    if (!dataHolder.ratingsData.length > 0) {
      const rl = readline.createInterface({
        input: fs.createReadStream(`./data/csv-data/small/ratings.csv`),
        crlfDelay: Infinity,
      })
      let total = -1
      let cats
      let ratings = []
      rl.on('line', function (line) {
        if (total === -1) {
          cats = line.split(',')

          total++
          return
        }

        let rating = []
        let ratingValues = line.split(',')

        rating[0] = parseInt(ratingValues[0])
        rating[1] = parseInt(ratingValues[1])
        rating[2] = parseFloat(ratingValues[2])
        ratings.push(rating)
        total++
      })
      rl.on('close', () => {
        let t2 = performance.now()
        console.log('done?', t2 - t1)
        dataHolder.ratingsData = ratings
        resolve(ratings)
      })
    } else {
      let t2 = performance.now()
      console.log('done?', t2 - t1)
      resolve(dataHolder.ratingsData)
    }
  })
}

dataReader.getMoviesLineI = async () => {
  return new Promise((resolve, reject) => {
    let t1 = performance.now()

    const rl = readline.createInterface({
      input: fs.createReadStream(`./data/csv-data/small/movies.csv`),
      crlfDelay: Infinity,
    })
    let total = 0
    let cats
    let dataEntries = []
    rl.on('line', function (line) {
      if (total === 0) {
        cats = line.split(',')
        console.log(cats)
      }

      let dataSplit = line.split(',')
      dataEntries[total - 1] = dataSplit
      total++
    })
    rl.on('close', () => {
      let t2 = performance.now()
    })
  })
}

// dataReader.getMovies = async () => {
//   return new Promise((resolve, reject) => {
//     let t1 = performance.now()
//     let m = fs.readFile(`./data/csv-data/small/movies.csv`, 'utf8', (err, data) => {
//       if (err) {
//         reject(err)
//       }
//       let t2 = performance.now()

//       console.log('data', t2 - t1)
//       // console.log(data)
//       //resolve(dataHolder.movieData)
//     })
//   })
// }

module.exports = dataReader
