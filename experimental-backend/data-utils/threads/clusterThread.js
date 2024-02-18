'use strict'

const cluster = require('node:cluster')
const addon = require('../../build/Release/addonCalculations.node')

process.on('message', (msg) => {
  if (msg.work === 'numratings') {
    let numRatingsArr = []
    let alreadyCheckedRatingsIndexes = 0
    let isCurrMovId = false

    for (let j = 0; j < msg.movIds.length; j++) {
      let numRatings = 0

      for (let i = alreadyCheckedRatingsIndexes; i < msg.ratingsIds.length; i++) {
        if (msg.ratingsIds[i] === msg.movIds[j]) {
          if (!isCurrMovId) {
            isCurrMovId = true
            alreadyCheckedRatingsIndexes = i
          }
          numRatings++
        } else if (isCurrMovId && msg.ratingsIds[i] !== msg.movIds[j]) {
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
    let numRatings = addon.getNumRatings(msg.ratingsIds, msg.movIds)
    // let numRatings = addon.getNumRatings(new Int32Array(msg.ratingsIds), new Int32Array(msg.msg.movIds))
    // console.log(`fork id${cluster.worker.id} done`, performance.now() - t1)
    process.send({ work: 'numratings', numRatingsArr: numRatings })
  }
  process.exit()
})
