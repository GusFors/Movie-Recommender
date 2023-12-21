'use strict'

const fs = require('fs')
const readline = require('node:readline')
const cluster = require('node:cluster')
const { arrayChunkPush } = require('./arrayChunk')
const DATASET = require('./dataFormats').smallData
// const { fullData, largeData, smallData, debugData } = require('./dataFormats')

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
  ratingMovieIds: new Uint32Array(),
  ratingScores: new Float64Array(),
  ratingNum: new Uint32Array(),
}

dataReader.getRatingsLineI = async () => {
  return new Promise((resolve, reject) => {
    if (!dataHolder.ratingScores.length > 0) {
      const rl = readline.createInterface({
        input: fs.createReadStream(`./data/csv-data/${DATASET.path}/ratings.csv`, {}),
        crlfDelay: Infinity,
      })

      let total = DATASET.lineSkip

      let ratingUserIds = []
      let ratingMovieIds = []
      let ratingScores = []

      rl.on('line', function (line) {
        if (total === DATASET.lineSkip) {
          total++
          return
        }

        // let ratingUserId = line[0]
        let valueCnt = 0
        let ratingUserId = ''
        let ratingMovieId = ''
        let ratingScore = ''

        for (let i = 0; i < line.length; i++) {
          // if (valueCnt > 2) {
          //   break
          // }

          // if (line[i] === DATASET.separator[0]) {
          //   valueCnt += 1 / DATASET.separator.length
          //   continue
          // }

          // if (valueCnt === 0) {
          //   ratingUserId += line[i]
          // }

          // if (valueCnt === 1) {
          //   ratingMovieId += line[i]
          // }

          // if (valueCnt === 2) {
          //   ratingScore += line[i]
          // }

          if (valueCnt > 2) {
            break
          }

          if (line[i] === DATASET.separator[0]) {
            valueCnt += 1 / DATASET.separator.length
            continue
          }

          // switch (valueCnt) {
          //   case 0:
          //     ratingUserId += line[i]
          //   case 1:
          //     ratingMovieId += line[i]
          //   case 2:
          //     ratingScore += line[i]

          // }

          if (valueCnt === 0) {
            ratingUserId += line[i]
          }

          if (valueCnt === 1) {
            ratingMovieId += line[i]
          }

          if (valueCnt === 2) {
            ratingScore += line[i]
          }
        }

        // if(total > 7000000) {
        //  return
        // }
        ratingUserIds.push(+ratingUserId)
        ratingMovieIds.push(+ratingMovieId)
        ratingScores.push(+ratingScore)

        // let ratingValues = line.split(split) // slowest part // parse line buffer?

        total++
      })

      rl.on('close', () => {
        dataHolder.ratingUserIds = new Uint32Array(ratingUserIds)
        dataHolder.ratingMovieIds = new Uint32Array(ratingMovieIds)
        dataHolder.ratingScores = new Float64Array(ratingScores)
        resolve({ u: dataHolder.ratingUserIds, m: dataHolder.ratingMovieIds, s: dataHolder.ratingScores })
      })
    } else {
      resolve({ u: dataHolder.ratingUserIds, m: dataHolder.ratingMovieIds, s: dataHolder.ratingScores })
      // resolve({ u: dataHolder.ratingUserIds.buffer, m: dataHolder.ratingMovieIds.buffer, s: dataHolder.ratingScores.buffer })
    }
  })
}

dataReader.getMoviesCompleteLineI = async (minNumRatings) => {
  return new Promise(async (resolve, reject) => {
    let movies = []
    let movIds = []
    if (!dataHolder.movieData.length > 0) {
      if (!dataHolder.ratingScores.length > 0) {
        await dataReader.getRatingsLineI()
      }

      const rl = readline.createInterface({
        input: fs.createReadStream(`./data/csv-data/${DATASET.path}/movies.csv`),
        crlfDelay: Infinity,
      })
      cluster.setupPrimary({ exec: './data-utils/dataWorker.js', serialization: 'advanced' })
      cluster.on('online', (worker) => {
        console.log('fork online')
      })

      let total = DATASET.lineSkip
      let cats

      let t1 = performance.now()
      rl.on('line', function (line) {
        if (total === DATASET.lineSkip) {
          cats = line.split(DATASET.separator)
          total++
          return
        }

        let values = line.split(DATASET.separator)
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
        let sortedByMovieId = new Uint32Array(rMovIds).sort()
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
          setTimeout(() => {
            fork.send({ work: 'numratings', ratingsIds: sortedByMovieId, movIds: movIdChunks[w] })
          }, 0)
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
        dataHolder.ratingNum = numRatingsArr
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
        let moviesWithRatings = []
        for (let y = 0; y < numRatingsArr.length; y++) {
          movies[y].numRatings = numRatingsArr[y]
          if (numRatingsArr[y] >= minNumRatings) {
            moviesWithRatings.push(movies[y])
          }
        }

        console.log(`set numRatings >=${minNumRatings}`, performance.now() - m1)

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

        //dataHolder.movieData = moviesWithRatings
        dataHolder.movieData = movies
        // console.log(dataHolder.movieData.length, 'length')
        // console.log(dataHolder.movieData)
        // resolve(dataHolder.movieData)
        resolve(moviesWithRatings)
      })
    } else {
      let moviesWithRatings = []
      // console.log(dataHolder.movieData)
      for (let y = 0; y < dataHolder.ratingNum.length; y++) {
        if (dataHolder.ratingNum[y] >= minNumRatings) {
          moviesWithRatings.push(dataHolder.movieData[y])
        }
      }
      // resolve(dataHolder.movieData)
      // console.log(moviesWithRatings)
      resolve(moviesWithRatings)
    }
  })
}

module.exports = dataReader
