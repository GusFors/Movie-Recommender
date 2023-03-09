process.on('message', (data) => {
  const minNumOfRatings = data.minNumRatings
  let calcData = []

  let movieIds = []
  let movieNumRatings = []
  let movieTitles = []

  for (let y = 0, l = data.moviesData.length; y < l; y++) {
    if (data.moviesData[y].numRatings >= minNumOfRatings) {
      movieIds.push(data.moviesData[y].movieId)
      movieNumRatings.push(data.moviesData[y].numRatings)
      movieTitles.push(data.moviesData[y].title)
    }
  }

  let t1 = performance.now()

  // let wScoresortedByMovieId = JSON.parse(JSON.stringify(data.weightedScores))
  let wScoresortedByMovieId = data.weightedScores

  let wScoreIds = []
  let wScoreRatings = []
  let wScoreSims = []
  for (let y = 0, l = wScoresortedByMovieId.length; y < l; y++) {
    wScoreIds.push(wScoresortedByMovieId[y].movieId)
    wScoreRatings.push(wScoresortedByMovieId[y].weightedRating)
    wScoreSims.push(wScoresortedByMovieId[y].simScore)
  }

  // let alreadyCheckedRatingsIndexes = 0 // let j = //

  let c1 = performance.now()
  for (let i = 0, l = movieIds.length; i < l; i++) {
    let weightedScoreSum = 0
    let simScoreSum = 0
    // let currMovId = movieIds[i]

    for (let j = 0, w = wScoreIds.length; j < w; j++) {
      // checks++
      if (movieIds[i] === wScoreIds[j]) {
        weightedScoreSum = weightedScoreSum + wScoreRatings[j]
        simScoreSum = simScoreSum + wScoreSims[j]
        // alreadyCheckedRatingsIndexes++
      }
    }

    if (weightedScoreSum > 0) {
      calcData.push({
        movieId: movieIds[i],
        title: movieTitles[i],
        numRatings: movieNumRatings[i],
        recommendationScore: weightedScoreSum / simScoreSum,
      })
    }
  }
  let c2 = performance.now()
  let t2 = performance.now()
  // console.log('checks:', checks)
  console.log(`fork with id: ${data.id} took ${t2 - t1}ms to calc`, calcData.length, c2 - c1) // (${process.execArgv})

  process.send({ message: 'done', data: calcData, id: data.id })
})