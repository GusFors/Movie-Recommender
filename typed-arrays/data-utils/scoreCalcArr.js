process.on('message', (data) => {
  const minNumOfRatings = data.minNumRatings
  let calcData = []

  let moviesAboveMinNumRatings = []
  let movieIds = []

  for (let y = 0, l = data.moviesData.length; y < l; y++) {
    if (data.moviesData[y].numRatings >= minNumOfRatings) {
      moviesAboveMinNumRatings.push({
        movieId: data.moviesData[y].movieId,
        numRatings: data.moviesData[y].numRatings,
        title: data.moviesData[y].title,
      })
      movieIds.push(data.moviesData[y].movieId)
    }
  }

  let wScoreIds = []

  for (let y = 0, l = data.weightedScores.length; y < l; y++) {
    wScoreIds.push(data.weightedScores[y].movieId)
  }

  let t1 = performance.now()

  for (let i = 0, l = moviesAboveMinNumRatings.length; i < l; i++) {
    let weightedScoreSum = 0
    let simScoreSum = 0

    for (let j = 0, w = data.weightedScores.length; j < w; j++) {
      if (movieIds[i] === wScoreIds[j]) {
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

  let t2 = performance.now()
  console.log(`fork with id: ${data.id} took ${t2 - t1}ms to calc`, calcData.length) // (${process.execArgv})

  process.send({ message: 'done', data: calcData, id: data.id })
})
