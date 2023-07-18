'use strict'

const { parentPort, threadId } = require('worker_threads')

parentPort.on('message', (msg) => {
  if (msg.work === 'scores') {
    // let weightedScores = msg.weightedScores

    // console.log('clusrefed')
    let t1 = performance.now()
    let simScores = msg.simScores
    let scores = msg.scores
    let movIds = msg.movIds
    let simUids = msg.simUids
    let userIds = msg.userIds

    let weightedScores = []

    for (let i = 0; i < movIds.length; i++) {
      if (!weightedScores[movIds[i]]) {
        weightedScores[movIds[i]] = []
      }
    }

    // for (let i = 0; i < movIds.length; i++) {
    //   if (!weightedScores[movIds[i]]) {
    //     weightedScores[movIds[i]] = new Float32Array(new SharedArrayBuffer())
    //   }
    // }

    let start = 0
    for (let s = 0, l = simUids.length; s < l; s++) {
      let isUserSection = false
      let end = 0
      for (let i = start, r = userIds.length; i < r; i++) {
        if (simUids[s] === userIds[i]) {
          if (!isUserSection) {
            isUserSection = true
            start = i
          }
        } else {
          if (isUserSection) {
            end = i
            break
          }
        }
      }

      for (let i = start, r = end > 0 ? end : userIds.length; i < r; i++) {
        weightedScores[movIds[i]].push({
          weightedRating: simScores[s] * scores[i],
          simScore: simScores[s],
        })
      }

    //   for (const [key, value] of Object.entries(weightedScores)) {
    //     weightedScores[key]
    //   }
      //   for (let i = start, r = end > 0 ? end : userIds.length; i < r; i++) {
      //     weightedScores[movIds[i]][s] = simScores[s] * scores[i]

      //    // weightedScores[movIds[i]][i + 1] = simScores[s]
      //   }
    }
    console.log(`scoreworker id${threadId} done`, performance.now() - t1)
    // console.log(weightedScores)
    parentPort.postMessage({ work: 'scores', weightedScores: weightedScores })
  }
})
