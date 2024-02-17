'use strict'

const fs = require('fs')
const readline = require('node:readline')
const cluster = require('node:cluster')
const { arrayChunkPush } = require('./arrayChunk')
const DATASET = require('./dataFormats').fullData
const addon = require('../build/Release/addonCsvReader.node')
const { Worker } = require('worker_threads')

const dataReader = {}

const dataHolder = {
  userData: [],
  userIdData: new Set(),
  ratingsData: [],
  movieTitles: [],
  movieIdData: [],
  movieData: [],
  numRatings: [],
  ratingUserIds: new Int32Array(),
  ratingMovieIds: new Int32Array(),
  ratingScores: new Float32Array(),
  ratingNum: new Int32Array(),
}

cluster.setupPrimary({ exec: './data-utils/threads/clusterThread.js', serialization: 'advanced' })
const threads = 4
const workers = []
for (let w = 0; w < threads; w++) {
  cluster.fork()
  workers[w] = new Worker('./data-utils/threads/workerThread.js', {})
}

dataReader.getRatingsLineI = async () => {
  return new Promise((resolve, reject) => {
    if (!dataHolder.ratingScores?.length > 0) {
      const rl = readline.createInterface({
        input: fs.createReadStream(`./data/csv-data/${DATASET.path}/ratings.csv`, {}),
        crlfDelay: Infinity,
      })

      let ratingUserIds = new Int32Array(DATASET.size)
      let ratingMovieIds = new Int32Array(DATASET.size)
      let ratingScores = new Float32Array(DATASET.size)
      let isFirstLineCheck = DATASET.lineSkip
      let total = 0

      rl.on('line', function (line) {
        if (isFirstLineCheck) {
          isFirstLineCheck = false
          return
        }

        let valueCnt = 0
        let ratingUserId = ''
        let ratingMovieId = ''
        let ratingScore = ''

        for (let i = 0; i < line.length; i++) {
          if (valueCnt > 2) {
            break
          }

          if (line[i] === DATASET.separator[0]) {
            valueCnt += 1 / DATASET.separator.length
            continue
          }

          if (valueCnt === 0) {
            ratingUserId += line[i]
          }

          if (valueCnt === 1) {
            ratingMovieId += line[i]
          }

          if (valueCnt === 2) {
            ratingScore += line[i]
          }

          // if (!valueCnt) {
          //   ratingUserId += line[i]
          // } else if (valueCnt === 1) {
          //   ratingMovieId += line[i]
          // } else if (valueCnt === 2) {
          //   ratingScore += line[i]
          //   ratingScore += line[i + 1]
          //   ratingScore += line[i + 2]
          //   break
          // }
        }

        ratingUserIds[total] = +ratingUserId
        ratingMovieIds[total] = +ratingMovieId
        ratingScores[total] = +ratingScore
        total++
      })

      rl.on('close', () => {
        // dataHolder.ratingUserIds = new Int32Array(ratingUserIds.buffer.transferToFixedLength())
        // dataHolder.ratingMovieIds = new Int32Array(ratingMovieIds.buffer.transferToFixedLength())
        // dataHolder.ratingScores = new Float32Array(ratingScores.buffer.transferToFixedLength())

        dataHolder.ratingUserIds = Array.from(new Int32Array(ratingUserIds.buffer.transferToFixedLength()))
        dataHolder.ratingMovieIds = Array.from(new Int32Array(ratingMovieIds.buffer.transferToFixedLength()))
        dataHolder.ratingScores = Array.from(new Float32Array(ratingScores.buffer.transferToFixedLength()))

        resolve({ u: dataHolder.ratingUserIds, m: dataHolder.ratingMovieIds, s: dataHolder.ratingScores })
      })
    } else {
      resolve({ u: dataHolder.ratingUserIds, m: dataHolder.ratingMovieIds, s: dataHolder.ratingScores })
      // resolve({ u: dataHolder.ratingUserIds.slice(), m: dataHolder.ratingMovieIds.slice(), s: dataHolder.ratingScores.slice() })
      // resolve({ u: dataHolder.ratingUserIds.buffer, m: dataHolder.ratingMovieIds.buffer, s: dataHolder.ratingScores.buffer })
    }
  })
}

dataReader.getMoviesCompleteLineI = async (minNumRatings, threading = 'Worker', addon = true) => {
  return new Promise(async (resolve, reject) => {
    let movies = []
    let movIds = []
    let promises = []

    if (!dataHolder.movieData.length > 0) {
      if (!dataHolder.ratingScores.length > 0) {
        await dataReader.getRatingsLineI()
      }

      const rl = readline.createInterface({
        input: fs.createReadStream(`./data/csv-data/${DATASET.path}/movies.csv`),
        crlfDelay: Infinity,
      })

      let isFirstLineCheck = DATASET.lineSkip
      let t1 = performance.now()

      rl.on('line', function (line) {
        if (isFirstLineCheck) {
          isFirstLineCheck = false
          return
        }

        let values = line.split(DATASET.separator)
        let title = values[1]

        if (values.length > 3) {
          title = RegExp(/"([^|]+)"/).exec(line)[1]
        }

        movies.push({ movieId: +values[0], title: title, numRatings: 0 })
        movIds.push(+values[0])
      })

      rl.on('close', async () => {
        console.log('movies close', performance.now() - t1)
        // let rMovIds = []
        // for (let i = 0, l = dataHolder.ratingScores.length; i < l; i++) {
        //   rMovIds.push(dataHolder.ratingMovieIds[i])
        // }

        let sort1 = performance.now()
        // let sortedByMovieId = %TypedArraySortFast(new Int32Array(rMovIds));
        // let sortedByMovieId = new Int32Array(rMovIds).sort()
        let sortedByMovieId = new Int32Array(dataHolder.ratingMovieIds).sort()
        console.log('sort movies', performance.now() - sort1)

        let movIdChunks = arrayChunkPush(movIds, threads)

        if (threading === 'Fork') {
          for (let w = 0; w < threads; w++) {
            cluster.workers[w + 1].send({
              work: addon ? 'addon' : 'numratings',
              ratingsIds: Int32Array.from(sortedByMovieId),
              movIds: Int32Array.from(movIdChunks[w]),
            })

            promises[w] = new Promise(async (resolve, reject) => {
              cluster.workers[w + 1].on('message', (msg) => {
                if (msg.work === 'numratings') {
                  resolve(Array.from(msg.numRatingsArr))
                }
              })
            })
          }
        } else if (threading === 'Worker') {
          // let transferBuffer = new SharedArrayBuffer(rMovIds.length * Int32Array.BYTES_PER_ELEMENT)
          let sharedBuffer = new SharedArrayBuffer(sortedByMovieId.byteLength)
          let sharedArray = new Int32Array(sharedBuffer)

          for (let i = 0; i < sortedByMovieId.length; i++) {
            sharedArray[i] = sortedByMovieId[i]
          }

          for (let w = 0; w < threads; w++) {
            let movIdBufferTransfer = Int32Array.from(movIdChunks[w])
            workers[w].postMessage({ work: addon ? 'addon' : 'numratings', ratingsIds: sharedArray, movIds: movIdBufferTransfer }, [
              movIdBufferTransfer.buffer,
            ])

            promises[w] = new Promise(async (resolve, reject) => {
              workers[w].on('message', (msg) => {
                if (msg.work === 'numratings') {
                  // worker.terminate()
                  resolve(Array.from(msg.numRatingsArr))
                }
              })
            })
          }
        }

        let numRatingsArr = new Array(movIds.length)
        let values = await Promise.all(promises)

        let w1 = performance.now()
        let combinedNumRatings = values.flat()

        for (let j = 0; j < combinedNumRatings.length; j++) {
          numRatingsArr[j] = combinedNumRatings[j]
        }

        dataHolder.ratingNum = numRatingsArr
        console.log('put together fork data', performance.now() - w1)

        let m1 = performance.now()
        let moviesWithRatings = []

        for (let y = 0; y < numRatingsArr.length; y++) {
          movies[y].numRatings = numRatingsArr[y]
          if (numRatingsArr[y] >= minNumRatings) {
            moviesWithRatings.push(movies[y])
          }
        }
        console.log(`set numRatings >=${minNumRatings}`, performance.now() - m1)

        dataHolder.movieData = movies
        resolve(moviesWithRatings)
      })
    } else {
      let moviesWithRatings = []

      for (let y = 0; y < dataHolder.ratingNum.length; y++) {
        if (dataHolder.ratingNum[y] >= minNumRatings) {
          moviesWithRatings.push(dataHolder.movieData[y])
        }
      }
      resolve(moviesWithRatings)
    }
  })
}

dataReader.getRatingsAddon = async () => {
  return new Promise((resolve, reject) => {
    if (!dataHolder.ratingScores?.length > 0) {
      let data = addon.getRatings(DATASET.size, DATASET.lineSkip, `./data/csv-data/${DATASET.path}/ratings.csv`)

      dataHolder.ratingUserIds = new Int32Array(data['0'])
      dataHolder.ratingMovieIds = new Int32Array(data['1'])
      dataHolder.ratingScores = new Float32Array(data['2'])
      resolve({ u: dataHolder.ratingUserIds, m: dataHolder.ratingMovieIds, s: dataHolder.ratingScores })
    } else {
      resolve({ u: dataHolder.ratingUserIds, m: dataHolder.ratingMovieIds, s: dataHolder.ratingScores })
      // resolve({ u: dataHolder.ratingUserIds.buffer, m: dataHolder.ratingMovieIds.buffer, s: dataHolder.ratingScores.buffer })
    }
  })
}

module.exports = dataReader
