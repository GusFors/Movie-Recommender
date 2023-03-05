const fs = require('fs')
const { open } = require('node:fs/promises')
const DATAPATH = 'small'
const readline = require('node:readline')
const dataReader = {}

const dataHolder = {
  userData: [],
  userIdData: [],
  ratingsData: [],
  movieTitles: [],
  movieIdData: [],
  movieData: [],
}

dataReader.getMoviesIdLineI = async () => {
  return new Promise((resolve, reject) => {
    let t1 = performance.now()
    if (!dataHolder.movieIdData.size > 0) {
      const rl = readline.createInterface({
        input: fs.createReadStream(`./data/csv-data/${DATAPATH}/movies.csv`),
        crlfDelay: Infinity,
      })
      let total = -1
      let cats
      let movieIds = []
      rl.on('line', function (line) {
        if (total === -1) {
          cats = line.split(',')
          total++
          return
        }

        movieIds.push(parseInt(line.split(',')[0]))
        total++
      })
      rl.on('close', () => {
        // let t2 = performance.now()
        // console.log('done?', t2 - t1)
        dataHolder.movieIdData = movieIds
        resolve(dataHolder.movieIdData)
      })
    } else {
      // let t2 = performance.now()
      // console.log('done?', t2 - t1)
      resolve(dataHolder.movieIdData)
    }
  })
}

dataReader.getMoviesTitleLineI = async () => {
  return new Promise((resolve, reject) => {
    let t1 = performance.now()
    if (!dataHolder.movieIdData.size > 0) {
      const rl = readline.createInterface({
        input: fs.createReadStream(`./data/csv-data/${DATAPATH}/movies.csv`),
        crlfDelay: Infinity,
      })
      let total = -1
      let cats
      let movieTitles = []
      rl.on('line', function (line) {
        if (total === -1) {
          cats = line.split(',')
          total++
          return
        }
        // movieIds[total] = parseInt(line.split(',')[0]) // after
        movieTitles.push(parseInt(line.split(',')[1]))
        total++
      })
      rl.on('close', () => {
        // let t2 = performance.now()
        // console.log('done?', t2 - t1)
        dataHolder.movieTitles = movieTitles
        resolve(dataHolder.movieTitles)
      })
    } else {
      // let t2 = performance.now()
      // console.log('done?', t2 - t1)
      resolve(dataHolder.movieTitles)
    }
  })
}

dataReader.getMoviesCompleteLineI = async () => {
  return new Promise((resolve, reject) => {
    let t1 = performance.now()
    if (!dataHolder.movieData.length > 0) {
      const rl = readline.createInterface({
        input: fs.createReadStream(`./data/csv-data/${DATAPATH}/movies.csv`),
        crlfDelay: Infinity,
      })
      let total = -1
      let cats
      let movies = []
      rl.on('line', function (line) {
        if (total === -1) {
          cats = line.split(',')
          total++
          return
        }

        let values = line.split(',') // ignores part of titles with , check length and add if more than 2?
        let title = values[1]
        if (values.length > 3) {
          title = RegExp(/"([^|]+)"/).exec(line)[1]
          // console.log(title)
        }
        movies.push({ movieId: parseInt(values[0]), title: title })
        total++
      })
      rl.on('close', () => {
        let rMovIds = []

        for (let i = 0, l = dataHolder.ratingsData.length; i < l; i++) {
          rMovIds.push(dataHolder.ratingsData[i][1])
        }

        let sortedByMovieId = rMovIds.sort((a, b) => a - b)
        let alreadyCheckedRatingsIndexes = 0

        for (let j = 0; j < movies.length; j++) {
          let numRatings = 0
          for (let i = alreadyCheckedRatingsIndexes, l = sortedByMovieId.length; i < l; i++) {
            if (sortedByMovieId[i] === movies[j].movieId) {
              numRatings++
              alreadyCheckedRatingsIndexes++
            }
          }
          movies[j].numRatings = numRatings
        }

        // let t2 = performance.now()
        // console.log('m done?', t2 - t1)

        dataHolder.movieData = movies
        resolve(dataHolder.movieData)
      })
    } else {
      // let t2 = performance.now()
      // console.log('done?', t2 - t1)
      resolve(dataHolder.movieData)
    }
  })
}

dataReader.getUserIdLineI = async () => {
  return new Promise((resolve, reject) => {
    let t1 = performance.now()
    if (!dataHolder.userIdData.size > 0) {
      const rl = readline.createInterface({
        input: fs.createReadStream(`./data/csv-data/${DATAPATH}/ratings.csv`),
        crlfDelay: Infinity,
      })
      let total = -1
      let cats
      let userIdSet = new Set() // set only stores unique values
      rl.on('line', function (line) {
        if (total === -1) {
          cats = line.split(',')
          total++
          return
        }

        userIdSet.add(parseInt(line.split(',')[0])) // after
        total++
      })
      rl.on('close', () => {
        // let t2 = performance.now()
        // console.log('done?', t2 - t1)
        dataHolder.userIdData = userIdSet
        resolve([...dataHolder.userIdData])
      })
    } else {
      // let t2 = performance.now()
      // console.log('done?', t2 - t1)
      resolve([...dataHolder.userIdData])
    }
  })
}

dataReader.getRatingsLineI = async () => {
  return new Promise((resolve, reject) => {
    let t1 = performance.now()

    if (!dataHolder.ratingsData.length > 0) {
      const rl = readline.createInterface({
        input: fs.createReadStream(`./data/csv-data/${DATAPATH}/ratings.csv`),
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
        // let t2 = performance.now()
        // console.log('done?', t2 - t1)
        dataHolder.ratingsData = ratings
        resolve(ratings)
      })
    } else {
      // let t2 = performance.now()
      // console.log('done?', t2 - t1)
      resolve(dataHolder.ratingsData)
    }
  })
}

module.exports = dataReader
