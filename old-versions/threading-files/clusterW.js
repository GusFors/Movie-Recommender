const cluster = require('node:cluster')

process.on('message', (msg) => {
  if (msg.work === 'scores') {
    let weightedScores = msg.weightedScores
    let simScores = msg.simScores
    let scores = msg.scores
    let movIds = msg.movIds
    let simUids = msg.simUids
    let userIds = msg.userIds
    // console.log('clusrefed')
    let t1 = performance.now()
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
    }
    console.log(`score fork id${cluster.worker.id} done`, performance.now() - t1)
    process.send({ work: 'scores', weightedScores: weightedScores })
    // setTimeout(() => {
    //   process.exit()
    // }, 1000)
  }
})
