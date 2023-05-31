'use strict'

const fs = require('fs')
const readline = require('node:readline')
const cluster = require('node:cluster')

const DATAPATH = 'dat'
const split = '::'
const startCount = 0

// const DATAPATH = 'full'
// const split = ','
// const startCount = -1

// const DATAPATH = 'small'
// const split = ','
// const startCount = -1

// const DATAPATH = 'original'
// const split = ';'
// const startCount = -1

const dataReader = {}

const dataHolder = {
  userData: [],
  userIdData: new Set(),
  ratingsData: [],
  movieTitles: [],
  movieIdData: [],
  movieData: [],
  numRatings: [],
  ratingUserIds: new Uint32Array(),
  ratingMovieIds: new Int32Array(),
  ratingScores: new Float32Array(),
}

dataReader.getRatingsLineI = async () => {
  return new Promise((resolve, reject) => {
    if (!dataHolder.ratingScores.length > 0) {
      const rl = readline.createInterface({
        input: fs.createReadStream(`./data/csv-data/${DATAPATH}/ratings.csv`, {}),
        crlfDelay: Infinity,
      })

      let total = startCount

      let ratingUserIds = []
      let ratingMovieIds = []
      let ratingScores = []

      rl.on('line', function (line) {
        if (total === startCount) {
          // cats = line.split(split)
          total++
          return
        }

        // let rating = []
        // let rating = new Float32Array(3)
        // let rating = new Float64Array(3)
        // let rating = new Int32Array(3)

        let valueCnt = 0
        // let ratingUserId = line[0]
        let ratingUserId = ''
        let ratingMovieId = ''
        let ratingScore = ''

        for (let i = 0; i < line.length; i++) {
          if (valueCnt > 2) {
            break
          }

          if (line[i] === split[0]) {
            valueCnt += 1 / split.length
            continue
          }

          if (valueCnt === 0) {
            ratingUserId += line[i]
          }

          if (valueCnt === 1) {
            ratingMovieId += line[i]
            // valueCnt += 1 / split.length
          }

          if (valueCnt === 2) {
            ratingScore += line[i]
            // valueCnt += 1 / split.length
          }
        }

        ratingUserIds.push(+ratingUserId)
        ratingMovieIds.push(+ratingMovieId)
        ratingScores.push(+ratingScore)

        // let ratingValues = line.split(split) // slowest part // parse line buffer?

        // ratingUserIds.push(+ratingValues[0])
        // ratingMovieIds.push(+ratingValues[1])
        // ratingScores.push(+ratingValues[2])

        // // rating[0] = +ratingValues[0]
        // // rating[1] = +ratingValues[1]
        // // rating[2] = +ratingValues[2]

        // rating = new Float32Array(rating)
        // ratings.push(rating)
        total++
      })

      rl.on('close', () => {
        dataHolder.ratingUserIds = new Uint32Array(ratingUserIds)
        dataHolder.ratingMovieIds = new Int32Array(ratingMovieIds)
        dataHolder.ratingScores = new Float32Array(ratingScores)
        // console.log('close')
        // console.log(ratingScores)
        // console.log(ratingScores2)
        // for (let i = 0; i < ratingMovieIds2.length; i++) {
        //   if (ratingMovieIds2[i] !== ratingMovieIds[i]) {
        //     console.log('err')
        //   }
        // }
        resolve({ u: dataHolder.ratingUserIds, m: dataHolder.ratingMovieIds, s: dataHolder.ratingScores })
      })
    } else {
      resolve({ u: dataHolder.ratingUserIds, m: dataHolder.ratingMovieIds, s: dataHolder.ratingScores })
    }
  })
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

        movieIds.push(+line.split(split)[0])
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
        movieTitles.push(+line.split(split)[1])
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
      if (!dataHolder.ratingScores.length > 0) {
        await dataReader.getRatingsLineI()
      }

      const rl = readline.createInterface({
        input: fs.createReadStream(`./data/csv-data/${DATAPATH}/movies.csv`),
        crlfDelay: Infinity,
      })
      cluster.setupPrimary({ exec: './data-utils/dataWorker.js', serialization: 'advanced' })
      cluster.on('online', (worker) => {
        console.log('fork online')
      })

      // let fork = cluster.fork()
      // fork.send('hello fork')

      let total = startCount
      let cats
      let movies = []
      let movIds = []
      let t1 = performance.now()
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
        movies.push({ movieId: +values[0], title: title, numRatings: 0 })
        movIds.push(+values[0])
        total++
      })

      rl.on('close', async () => {
        let rMovIds = []

        for (let i = 0, l = dataHolder.ratingScores.length; i < l; i++) {
          rMovIds.push(dataHolder.ratingMovieIds[i])
        }
        console.log('movies close', performance.now() - t1)
        let sort1 = performance.now()
        // let sortedByMovieId = rMovIds.sort((a, b) => a - b)
        // let sortedByMovieId = %TypedArraySortFast(new Int32Array(rMovIds));
        let sortedByMovieId = new Int32Array(rMovIds).sort()
        console.log('sort movies', performance.now() - sort1)
        // console.log(sortedByMovieId)
        // movIds = new Array(...movIds)
        let threads = 1
        let movIdChunks = arrayChunkPush(movIds, threads)
        let promises = []
        // console.log(movIds)
        // console.log(movIdChunks)

        for (let w = 0; w < threads; w++) {
          let fork = cluster.fork()
          fork.send({ work: 'numratings', ratingsIds: sortedByMovieId, movIds: movIdChunks[w] })
          promises[w] = new Promise(async (resolve, reject) => {
            fork.on('message', (msg) => {
              // console.log(msg)
              if (msg.work === 'numratings') {
                // console.log(msg)
                resolve(msg.numRatingsArr)
              }
            })
          })
        }

        let numRatingsArr = new Array(movIds.length) // []

        let values = await Promise.all(promises) // promise all order preserved?
        let w1 = performance.now()
        // console.log(values)
        let combinedNumRatings = values.flat()

        for (let j = 0; j < combinedNumRatings.length; j++) {
          numRatingsArr[j] = combinedNumRatings[j]
          // numRatingsArr.push(values[j][i])
        }

        // let values = await Promise.all(promises)
        // let w1 = performance.now()
        // for (let j = 0; j < values.length; j++) {
        //   for (let i = 0; i < values[j].length; i++) {
        //     numRatingsArr.push(values[j][i])
        //   }
        // }
        console.log('put together fork data', performance.now() - w1)
        // console.log(numRatingsArr)
        // let numRatingsArr = await new Promise(async (resolve, reject) => {
        //   cluster.on('message', (worker, msg) => {
        //     // console.log(msg)
        //     if (msg.work === 'numratings') {
        //       resolve(msg.numRatingsArr)
        //     }
        //   })
        //   // setTimeout(() => {
        //   //   console.log('been awaited')
        //   //   resolve(1)
        //   // }, 3000);
        // })
        console.log('waited?')
        // let numRatingsArr = []
        // let alreadyCheckedRatingsIndexes = 0
        // let isMovieId = false
        // for (let j = 0; j < movIds.length; j++) {
        //   let numRatings = 0
        //   for (let i = alreadyCheckedRatingsIndexes, l = sortedByMovieId.length; i < l; i++) {
        //     if (sortedByMovieId[i] === movIds[j]) {
        //       numRatings++
        //       alreadyCheckedRatingsIndexes++
        //     }
        //   }
        //   // movies[j].numRatings = numRatings
        //   numRatingsArr.push(numRatings)
        //   // dataHolder.numRatings.push(numRatings)
        // }
        // console.log()
        let m1 = performance.now()
        for (let y = 0; y < numRatingsArr.length; y++) {
          movies[y].numRatings = numRatingsArr[y]
        }

        console.log('set numRatings', performance.now() - m1)

        // Promise.all()

        // for (let j = 0; j < movies.length; j++) {
        //   let numRatings = 0
        //   for (let i = alreadyCheckedRatingsIndexes, l = sortedByMovieId.length; i < l; i++) {
        //     if (sortedByMovieId[i] === movies[j].movieId) {
        //       numRatings++
        //       alreadyCheckedRatingsIndexes++
        //     }
        //   }
        //   movies[j].numRatings = numRatings
        //   dataHolder.numRatings.push(numRatings)
        // }

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

        userIdSet.add(+line.split(split)[0]) // after
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
      userIdSet.add(+line.split(split)[0]) // after
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
      rating.userId = +ratingValues[0]
      rating.movieId = +ratingValues[1]
      rating.rating = +ratingValues[2]
      // rating[0] = +(ratingValues[0])
      // rating[1] = +(ratingValues[1])
      // rating[2] = +(ratingValues[2])
      ratings.push(rating)
      total++
    })

    rl.on('close', () => {
      resolve(ratings)
    })
  })
}

module.exports = dataReader

function arrayChunkPush(arr, chunkCnt) {
  let chunkSize = arr.length % chunkCnt === 0 ? arr.length / chunkCnt : Math.floor(arr.length / chunkCnt)

  let temp = []

  for (let c = 0; c < chunkCnt; c++) {
    temp.push([])
  }

  for (let c = 0; c < chunkCnt; c++) {
    for (let i = c * chunkSize; i < chunkSize * (c + 1); i++) {
      temp[c].push(arr[i])
    }
  }

  // if (arr.length % chunkCnt !== 0) {
  //   for (let r = arr.length - 1; r >= arr.length - (arr.length % chunkCnt); r--) {
  //     temp[0].push(arr[r])
  //   }
  // }

  if (arr.length % chunkCnt !== 0) {
    for (let r = arr.length - (arr.length % chunkCnt); r <= arr.length - 1; r++) {
      temp[temp.length - 1].push(arr[r])
    }
  }

  return temp
}

// const DATAPATH = 'dat'
// const split = '::'
// const startCount = 0

// const DATAPATH = 'small'
// const split = ','
// const startCount = -1

// const DATAPATH = 'original'
// const split = ';'
// const startCount = -1

// const DATAPATH = 'full'
// const split = ','
// const startCount = -1
