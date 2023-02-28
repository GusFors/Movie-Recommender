const { parentPort, threadId } = require('worker_threads')
const { serialize, deserialize } = require('v8')

parentPort.on('message', (data) => {
  // seems to speed up the loops compared to just sending the plain array or using structuredClone
  //let workerData = deserialize(data) //JSON.parse(JSON.stringify(data))
  let workerData = data
  console.log('threadWorker spawned with id', threadId)

  const minNumOfRatings = workerData.minNumRatings
  let calcData = []
  let noTitleMov = []
  // let fixed = new Array(data.moviesData.length)
  // fixed[0] = {}
  // console.log(fixed)

  for (let y = 0, l = data.moviesData.length; y < l; y++) {
    if (data.moviesData[y].numRatings >= minNumOfRatings) {
      noTitleMov.push({ movieId: data.moviesData[y].movieId, numRatings: data.moviesData[y].numRatings })
      // fixed[y] = { movieId: data.moviesData[y].movieId, numRatings: data.moviesData[y].numRatings }
    }
    // else {
    //   y--
    // }
    //else {
    //   console.log(data.moviesData[y])
    // }
  }

  let t1 = performance.now()

  for (let i = 0, l = noTitleMov.length; i < l; i++) {
    let weightedScoreSum = 0
    let simScoreSum = 0
    let cMovId = noTitleMov[i].movieId

    for (let j = 0, w = data.weightedScores.length; j < w; j++) {
      if (cMovId === data.weightedScores[j].movieId) {
        weightedScoreSum = weightedScoreSum + data.weightedScores[j].weightedRating
        simScoreSum = simScoreSum + data.weightedScores[j].simScore
      }
    }

    if (weightedScoreSum > 0) {
      calcData.push({
        movieId: noTitleMov[i].movieId,
        title: data.moviesData[i].title, // can be wrong index?
        numRatings: noTitleMov[i].numRatings,
        recommendationScore: weightedScoreSum / simScoreSum,
      })
    }
  }

  let t2 = performance.now()
  console.log(`worker with id: ${threadId} took ${t2 - t1}ms to calc`)
  parentPort.postMessage({ message: 'done', data: calcData, id: threadId })
  // process.exit()
})

// function wScoreSum(mv, wr) {
//   if (mv.movieId === wr.movieId) {
//     return weightedScoreSum + data.weightedScores[j].weightedRating
//   }

// }

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
