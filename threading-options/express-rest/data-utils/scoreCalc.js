process.on('message', (data) => {
  //let data = JSON.parse(JSON.stringify(mdata)) // doesn't seem to make as much difference when forking compared to workers
  const minNumOfRatings = data.minNumRatings
  let calcData = []

  let noTitleMov = []
  let p1 = performance.now()
  for (let y = 0; y < data.moviesData.length; y++) {
    if (data.moviesData[y].numRatings >= minNumOfRatings) {
      noTitleMov.push({ movieId: data.moviesData[y].movieId, numRatings: data.moviesData[y].numRatings })
    }
  }

  let p2 = performance.now()
  console.log('made new calcMov in ', p2 - p1)

  let t1 = performance.now()

  for (let i = 0, l = noTitleMov.length; i < l; i++) {
    let weightedScoreSum = 0
    let simScoreSum = 0

    for (let j = 0, w = data.weightedScores.length; j < w; j++) {
      if (noTitleMov[i].movieId === data.weightedScores[j].movieId) {
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
// if (noTitleMov[i].numRatings >= minNumOfRatings) {
// last = data.moviesData[i]
// }
// console.log(data.moviesData[0])
