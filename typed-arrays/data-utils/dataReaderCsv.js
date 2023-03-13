const fs = require('fs')
const DATAPATH = 'small'
const split = ','
const startCount = -1

const readline = require('node:readline')
const dataReader = {}

const dataHolder = {
  userData: [],
  userIdData: new Uint32Array(),
  ratingsData: [],
  movieTitles: [],
  movieIdData: [],
  movieData: [],
  numRatings: [],
}

dataReader.getMoviesIdLineI = async () => {
  return new Promise((resolve, reject) => {
    if (!dataHolder.movieIdData.size > 0) {
      const rl = readline.createInterface({
        input: fs.createReadStream(`./data/csv-data/${DATAPATH}/movies.csv`),
        crlfDelay: Infinity,
      })

      let total = startCount
      let cats
      let movieIds = []

      rl.on('line', function (line) {
        if (total === startCount) {
          cats = line.split(split)
          total++
          return
        }

        movieIds.push(parseInt(line.split(split)[0]))
        total++
      })

      rl.on('close', () => {
        dataHolder.movieIdData = movieIds
        resolve(dataHolder.movieIdData)
      })
    } else {
      resolve(dataHolder.movieIdData)
    }
  })
}

dataReader.getMoviesTitleLineI = async () => {
  return new Promise((resolve, reject) => {
    if (!dataHolder.movieIdData.size > 0) {
      const rl = readline.createInterface({
        input: fs.createReadStream(`./data/csv-data/${DATAPATH}/movies.csv`),
        crlfDelay: Infinity,
      })

      let total = startCount
      let cats
      let movieTitles = []

      rl.on('line', function (line) {
        if (total === startCount) {
          cats = line.split(split)
          total++
          return
        }
        movieTitles.push(parseInt(line.split(split)[1]))
        total++
      })

      rl.on('close', () => {
        dataHolder.movieTitles = movieTitles
        resolve(dataHolder.movieTitles)
      })
    } else {
      resolve(dataHolder.movieTitles)
    }
  })
}

dataReader.getMoviesCompleteLineI = async () => {
  return new Promise(async (resolve, reject) => {
    if (!dataHolder.movieData.length > 0) {
      if (!dataHolder.ratingsData.length > 0) {
        await dataReader.getRatingsLineI()
      }

      const rl = readline.createInterface({
        input: fs.createReadStream(`./data/csv-data/${DATAPATH}/movies.csv`),
        crlfDelay: Infinity,
      })

      let total = startCount
      let cats
      let movies = []

      rl.on('line', function (line) {
        if (total === startCount) {
          cats = line.split(split)
          total++
          return
        }

        let values = line.split(split)
        let title = values[1]
        if (values.length > 3) {
          title = RegExp(/"([^|]+)"/).exec(line)[1]
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
          dataHolder.numRatings.push(numRatings)
        }

        dataHolder.movieData = movies
        resolve(dataHolder.movieData)
      })
    } else {
      // console.log(dataHolder.movieData)
      resolve(dataHolder.movieData)
    }
  })
}

dataReader.getMovieNumRatings = () => {
  return dataHolder.numRatings
}

dataReader.getUserIdLineI = async () => {
  return new Promise((resolve, reject) => {
    console.log('uidL')
    if (!dataHolder.userIdData.size > 0) {
      const rl = readline.createInterface({
        input: fs.createReadStream(`./data/csv-data/${DATAPATH}/ratings.csv`),
        crlfDelay: Infinity,
      })

      let total = startCount
      let cats
      let userIdSet = new Set() // set only stores unique values

      rl.on('line', function (line) {
        if (total === startCount) {
          cats = line.split(split)
          total++
          return
        }

        userIdSet.add(parseInt(line.split(split)[0])) // after
        total++
      })

      rl.on('close', () => {
        dataHolder.userIdData = userIdSet
        // dataHolder.userIdData = [...userIdSet]
        // dataHolder.userIdData = new Int32Array([...userIdSet])
        // new Int32Array([...dataHolder.userIdData])
        resolve(dataHolder.userIdData)
      })
    } else {
      resolve(structuredClone(dataHolder.userIdData))
    }
  })
}

dataReader.getUserIdLineObj = async () => {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(`./data/csv-data/${DATAPATH}/ratings.csv`),
      crlfDelay: Infinity,
    })

    let total = startCount
    let cats
    let userIdSet = new Set() // set only stores unique values

    rl.on('line', function (line) {
      if (total === startCount) {
        cats = line.split(split)
        total++
        return
      }
      userIdSet.add(parseInt(line.split(split)[0])) // after
      total++
    })

    rl.on('close', () => {
      let ids = [...userIdSet]
      let idObjs = []
      for (let i = 0; i < ids.length; i++) {
        idObjs.push({ userId: ids[i] })
      }
      resolve(idObjs)
    })
  })
}

dataReader.getRatingsLineI = async () => {
  return new Promise((resolve, reject) => {
    if (!dataHolder.ratingsData.length > 0) {
      const rl = readline.createInterface({
        input: fs.createReadStream(`./data/csv-data/${DATAPATH}/ratings.csv`),
        crlfDelay: Infinity,
      })

      let total = startCount
      let cats
      let ratings = []

      rl.on('line', function (line) {
        if (total === startCount) {
          cats = line.split(split)
          total++
          return
        }

        //let rating = []
        let rating = []
        let ratingValues = line.split(split)

        rating[0] = parseInt(ratingValues[0])
        rating[1] = parseInt(ratingValues[1])
        rating[2] = parseFloat(ratingValues[2])
        ratings.push(rating)
        total++
      })

      rl.on('close', () => {
        dataHolder.ratingsData = ratings
        resolve(ratings)
      })
    } else {
      // console.log(dataHolder.ratingsData)
      resolve(dataHolder.ratingsData)
    }
  })
}

dataReader.getRatingsLineObj = async () => {
  return new Promise((resolve, reject) => {
    // if (!dataHolder.ratingsData.length > 0) {
    const rl = readline.createInterface({
      input: fs.createReadStream(`./data/csv-data/${DATAPATH}/ratings.csv`),
      crlfDelay: Infinity,
    })

    let total = startCount
    let cats
    let ratings = []

    rl.on('line', function (line) {
      if (total === startCount) {
        cats = line.split(split)
        total++
        return
      }

      let rating = {}
      let ratingValues = line.split(split)
      rating.userId = parseInt(ratingValues[0])
      rating.movieId = parseInt(ratingValues[1])
      rating.rating = parseFloat(ratingValues[2])
      // rating[0] = parseInt(ratingValues[0])
      // rating[1] = parseInt(ratingValues[1])
      // rating[2] = parseFloat(ratingValues[2])
      ratings.push(rating)
      total++
    })

    rl.on('close', () => {
      resolve(ratings)
    })
  })
}

module.exports = dataReader

// const DATAPATH = 'dat'
// const split = '::'
// const startCount = 0

// const DATAPATH = 'small'
// const split = ','
// const startCount = -1
