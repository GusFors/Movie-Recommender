process.on('message', (data) => {
  //let data = JSON.parse(JSON.stringify(mdata)) // doesn't seem to make as much difference when forking compared to workers

  const minNumOfRatings = data.minNumRatings
  let calcData = []
  // console.log(data.id, 'alive')
  let moviesAboveMinNumRatings = []
  let p1 = performance.now()
  for (let y = 0, l = data.moviesData.length; y < l; y++) {
    if (data.moviesData[y].numRatings >= minNumOfRatings) {
      moviesAboveMinNumRatings.push({
        movieId: data.moviesData[y].movieId,
        numRatings: data.moviesData[y].numRatings,
        title: data.moviesData[y].title,
      })
    }
  }

  let p2 = performance.now()
  console.log('made new calcMov in ', p2 - p1)

  let t1 = performance.now()

  for (let i = 0, l = moviesAboveMinNumRatings.length; i < l; i++) {
    let weightedScoreSum = 0
    let simScoreSum = 0

    for (let j = 0, w = data.weightedScores.length; j < w; j++) {
      if (moviesAboveMinNumRatings[i].movieId === data.weightedScores[j].movieId) {
        weightedScoreSum = weightedScoreSum + data.weightedScores[j].weightedRating
        simScoreSum = simScoreSum + data.weightedScores[j].simScore
      }
    }

    if (weightedScoreSum > 0) {
      calcData.push({
        movieId: moviesAboveMinNumRatings[i].movieId,
        title: moviesAboveMinNumRatings[i].title, // can be wrong index?
        numRatings: moviesAboveMinNumRatings[i].numRatings,
        recommendationScore: weightedScoreSum / simScoreSum,
      })
    }
  }
  // console.log(calcData[0])
  let t2 = performance.now()
  console.log(`fork with id: ${data.id} took ${t2 - t1}ms to calc`) // (${process.execArgv})

  process.send({ message: 'done', data: calcData, id: data.id })
})

// calcData.push({
//   ...data.moviesData[i],
//   recommendationScore: weightedScoreSum / simScoreSum,
// })
// if (i < 5) {
//   console.log(data.moviesData[i])
// }
// data.moviesData[i].recommendationScore = weightedScoreSum / simScoreSum
// calcData.push(data.moviesData[i])
// let isSameMap = %HaveSameMap(data.moviesData[i], last)
// if (!isSameMap && i > 0) {
//   console.log('not same')
//   console.log(data.moviesData[i], last)
// }
// if (i > 0 && i < 5) {
//   console.log()
// }
// if (moviesAboveMinNumRatings[i].numRatings >= minNumOfRatings) {
// last = data.moviesData[i]
// }
// console.log(data.moviesData[0])
