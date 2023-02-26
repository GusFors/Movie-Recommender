const { parentPort, threadId } = require('worker_threads')
const { serialize, deserialize } = require('v8')

parentPort.on('message', (data) => {
  // seems to speed up the loops compared to just sending the plain array or using structuredClone
  //let workerData = deserialize(data) //JSON.parse(JSON.stringify(data))
  let workerData = data
  console.log('threadWorker spawned with id', threadId)

  const minNumOfRatings = workerData.minNumRatings
  let calcData = []
  let t1 = performance.now()

  for (let i = 0, l = workerData.moviesData.length; i < l; i++) {
    if (workerData.moviesData[i].numRatings >= minNumOfRatings) {
      let weightedScoreSum = 0
      let simScoreSum = 0

      for (let j = 0, w = workerData.weightedScores.length; j < w; j++) {
        if (workerData.moviesData[i].movieId === workerData.weightedScores[j].movieId) {
          weightedScoreSum = weightedScoreSum + workerData.weightedScores[j].weightedRating
          simScoreSum = simScoreSum + workerData.weightedScores[j].simScore
        }
      }

      if (weightedScoreSum > 0) {
        calcData.push({
          ...workerData.moviesData[i],
          recommendationScore: weightedScoreSum / simScoreSum,
        })
      }
    }
  }

  let t2 = performance.now()
  console.log(`worker with id: ${threadId} took ${t2 - t1}ms to calc`)
  parentPort.postMessage({ message: 'done', data: calcData, id: threadId })
  // process.exit()
})

//  last = workerData.moviesData[i]
// if (i > 5) {
//   console.log(%HaveSameMap(workerData.moviesData[i], workerData.moviesData[i - 1]))
// }
// let isSameMap = %HaveSameMap(workerData.moviesData[i], workerData.moviesData[i - 1])
// if (!isSameMap && i > 0) {
//   console.log('not same')
//   console.log(data.moviesData[i], last)
// }
//let data = JSON.parse(JSON.stringify(workerData)) // { ...workerData } // structuredClone(workerData)
