'use strict'

// const fs = require('fs')
// const readline = require('node:readline')
const cluster = require('node:cluster')

// const DATAPATH = 'dat'
// const split = '::'
// const startCount = 0

// if (cluster.isWorker) {
//   console.log(`worker ${cluster.worker.id}`)
// }

process.on('message', (msg) => {
  // process.send('back at ya')
  if (msg.work === 'numratings') {
    // console.log(msg)
    let t1 = performance.now()
    let numRatingsArr = []
    let sortedByMovieId = msg.ratingsIds
    let movIds = msg.movIds
    let alreadyCheckedRatingsIndexes = 0
    let isCurrMovId = false
    for (let j = 0; j < movIds.length; j++) {
      let numRatings = 0
      for (let i = alreadyCheckedRatingsIndexes, l = sortedByMovieId.length; i < l; i++) {
        if (sortedByMovieId[i] === movIds[j]) {
          if (!isCurrMovId) {
            isCurrMovId = true
          }
          numRatings++
          alreadyCheckedRatingsIndexes++
          // continue
        } else if (isCurrMovId && sortedByMovieId[i] !== movIds[j]) {
          isCurrMovId = false
          break
        }

        // if (isCurrMovId && sortedByMovieId[i] !== movIds[j]) {
        //   isCurrMovId = false
        //   break
        // }
      }

      // else {
      //   if (isCurrMovId) {
      //     break
      //   } else {
      //     isCurrMovId = false
      //   }
      // }

      // if (numRatings > 0) {
      numRatingsArr.push(numRatings)
      // }

      // movies[j].numRatings = numRatings
      // numRatingsArr.push(numRatings)
    }
    console.log(`fork id${cluster.worker.id} done`, performance.now() - t1)
    process.send({ work: 'numratings', numRatingsArr: numRatingsArr })
    process.exit()
  }
})

// const DATAPATH = 'small'
// const split = ','
// const startCount = -1
