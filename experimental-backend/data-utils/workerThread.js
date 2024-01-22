'use strict'

const { parentPort, threadId } = require('worker_threads')
const addon = require('../build/Release/addonCsvReader.node')

parentPort.on('message', (msg) => {
  if (msg.work === 'numratings') {
    let t1 = performance.now()
    let numRatingsArr = []
    let sortedByMovieId = msg.ratingsIds
    let movIds = msg.movIds
    let alreadyCheckedRatingsIndexes = 0
    let isCurrMovId = false

    for (let j = 0; j < movIds.length; j++) {
      let numRatings = 0

      for (let i = alreadyCheckedRatingsIndexes; i < sortedByMovieId.length; i++) {
        if (sortedByMovieId[i] === movIds[j]) {
          if (!isCurrMovId) {
            isCurrMovId = true
            alreadyCheckedRatingsIndexes = i
          }
          numRatings++
        } else if (isCurrMovId && sortedByMovieId[i] !== movIds[j]) {
          isCurrMovId = false
          break
        }
      }
      numRatingsArr.push(numRatings)
    }

    // console.log(`worker id${threadId} done`, performance.now() - t1)
    parentPort.postMessage({ work: 'numratings', numRatingsArr: numRatingsArr })
    // process.exit()
  } else if (msg.work === 'addon') {
    let t1 = performance.now()
    // console.log(msg.ratingsIds)
    // let addonCalc = addon.getNumRatings(msg.ratingsIds, msg.movIds)
    let addonCalc = addon.getNumRatings(new Uint32Array(msg.ratingsIds), new Uint32Array(msg.movIds))
    let r = Array.from(addonCalc)
    // console.log(msg.ratingsIds)

    // let r = Array.from(addon.getNumRatings(new Uint32Array(msg.ratingsIds), new Uint32Array(msg.movIds)))
    // console.log(`worker id${threadId} done`, performance.now() - t1)

    parentPort.postMessage({ work: 'numratings', numRatingsArr: r })
    // process.exit()
  }
})
