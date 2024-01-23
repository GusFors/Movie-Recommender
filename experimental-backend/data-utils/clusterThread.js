'use strict'

const cluster = require('node:cluster')
const addon = require('../build/Release/addonCalculations.node')

process.on('message', (msg) => {
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
    // console.log(`fork id${cluster.worker.id} done`, performance.now() - t1)
    process.send({ work: 'numratings', numRatingsArr: numRatingsArr })
  } else if (msg.work === 'addon') {
    let t1 = performance.now()
    let numRatings = addon.getNumRatings(new Int32Array(msg.ratingsIds), new Int32Array(msg.movIds))
    // console.log(`fork id${cluster.worker.id} done`, performance.now() - t1)
    process.send({ work: 'numratings', numRatingsArr: numRatings })
  }
  process.exit()
})
