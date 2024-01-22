'use strict'

const fs = require('fs')
const readline = require('node:readline')
const cluster = require('node:cluster')
const { arrayChunkPush } = require('./arrayChunk')
const DATASET = require('./dataFormats').smallData
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
  ratingUserIds: new Uint32Array(),
  ratingMovieIds: new Uint32Array(),
  ratingScores: new Float32Array(),
  ratingNum: new Uint32Array(),
}

cluster.setupPrimary({ exec: './data-utils/clusterThread.js', serialization: 'advanced' })
const threads = 2
for (let w = 0; w < threads; w++) {
  cluster.fork()
}

dataReader.getRatingsLineI = async () => {
  return new Promise((resolve, reject) => {
    if (!dataHolder.ratingScores.length > 0) {
      const rl = readline.createInterface({
        input: fs.createReadStream(`./data/csv-data/${DATASET.path}/ratings.csv`, {}),
        crlfDelay: Infinity,
      })

      let ratingUserIds = []
      let ratingMovieIds = []
      let ratingScores = []
      let isFirstLineCheck = DATASET.lineSkip

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

        ratingUserIds.push(+ratingUserId)
        ratingMovieIds.push(+ratingMovieId)
        ratingScores.push(+ratingScore)
      })

      rl.on('close', () => {
        dataHolder.ratingUserIds = new Uint32Array(ratingUserIds)
        dataHolder.ratingMovieIds = new Uint32Array(ratingMovieIds)
        dataHolder.ratingScores = new Float32Array(ratingScores)
        resolve({ u: dataHolder.ratingUserIds, m: dataHolder.ratingMovieIds, s: dataHolder.ratingScores })
      })
    } else {
      resolve({ u: dataHolder.ratingUserIds, m: dataHolder.ratingMovieIds, s: dataHolder.ratingScores })
      // resolve({ u: dataHolder.ratingUserIds.buffer, m: dataHolder.ratingMovieIds.buffer, s: dataHolder.ratingScores.buffer })
    }
  })
}

dataReader.getMoviesCompleteLineI = async (minNumRatings, threading = 'cluster') => {
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

        let movIdChunks = arrayChunkPush(movIds, threads)

        if (threading === 'cluster') {
          for (let w = 0; w < threads; w++) {
            cluster.workers[w + 1].send({
              work: 'numratings',
              ratingsIds: Uint32Array.from(sortedByMovieId),
              movIds: Uint32Array.from(movIdChunks[w]),
            })

            promises[w] = new Promise(async (resolve, reject) => {
              cluster.workers[w + 1].on('message', (msg) => {
                if (msg.work === 'numratings') {
                  resolve(msg.numRatingsArr)
                }
              })
            })
          }
        } else if (threading === 'clusteraddon') {
          for (let w = 0; w < threads; w++) {
            cluster.workers[w + 1].send({
              work: 'addon',
              ratingsIds: Uint32Array.from(sortedByMovieId).buffer,
              movIds: Uint32Array.from(movIdChunks[w]).buffer,
            })

            promises[w] = new Promise(async (resolve, reject) => {
              cluster.workers[w + 1].on('message', (msg) => {
                if (msg.work === 'numratings') {
                  resolve(msg.numRatingsArr)
                }
              })
            })
          }
        } else if (threading === 'worker') {
          for (let w = 0; w < threads; w++) {
            let worker = new Worker('./data-utils/workerThread.js', {})
            worker.postMessage({ work: 'numratings', ratingsIds: Uint32Array.from(sortedByMovieId), movIds: Uint32Array.from(movIdChunks[w]) })
            promises[w] = new Promise(async (resolve, reject) => {
              worker.on('message', (msg) => {
                if (msg.work === 'numratings') {
                  resolve(msg.numRatingsArr)
                }
              })
            })
          }
        } else if (threading === 'workeraddon') {
          for (let w = 0; w < threads; w++) {
            let worker = new Worker('./data-utils/workerThread.js', {})
            worker.postMessage({
              work: 'addon',
              ratingsIds: Uint32Array.from(sortedByMovieId).buffer,
              movIds: Uint32Array.from(movIdChunks[w]).buffer,
            })
            promises[w] = new Promise(async (resolve, reject) => {
              worker.on('message', (msg) => {
                if (msg.work === 'numratings') {
                  resolve(msg.numRatingsArr)
                }
              })
            })
          }
          // worker.terminate()
        }

        let numRatingsArr = new Array(movIds.length)
        let values = await Promise.all(promises)

        let w1 = performance.now()
        let combinedNumRatings = values.flat()

        for (let j = 0; j < combinedNumRatings.length; j++) {
          numRatingsArr[j] = combinedNumRatings[j]
          // numRatingsArr.push(values[j][i])
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
    if (!dataHolder.ratingScores.length > 0) {
      let data = addon.getRatings(DATASET.size, DATASET.lineSkip, `./data/csv-data/${DATASET.path}/ratings.csv`)

      dataHolder.ratingUserIds = new Uint32Array(data['0'])
      dataHolder.ratingMovieIds = new Uint32Array(data['1'])
      dataHolder.ratingScores = new Float32Array(data['2'])
      resolve({ u: dataHolder.ratingUserIds, m: dataHolder.ratingMovieIds, s: dataHolder.ratingScores })
    } else {
      resolve({ u: dataHolder.ratingUserIds, m: dataHolder.ratingMovieIds, s: dataHolder.ratingScores })
      // resolve({ u: dataHolder.ratingUserIds.buffer, m: dataHolder.ratingMovieIds.buffer, s: dataHolder.ratingScores.buffer })
    }
  })
}

module.exports = dataReader
