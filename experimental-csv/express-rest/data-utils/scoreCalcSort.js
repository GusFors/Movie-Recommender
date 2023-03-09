process.on('message', (data) => {
  const minNumOfRatings = data.minNumRatings
  let calcData = []

  let movieIds = []
  let movieNumRatings = []
  let movieTitles = []

  let t1 = performance.now()

  for (let y = 0, l = data.moviesData.length; y < l; y++) {
    if (data.moviesData[y].numRatings >= minNumOfRatings) {
      movieIds.push(data.moviesData[y].movieId)
      movieNumRatings.push(data.moviesData[y].numRatings)
      movieTitles.push(data.moviesData[y].title)
    }
  }

  let movIdSet = new Set(movieIds)

  // let wScoresortedByMovieId = JSON.parse(JSON.stringify(data.weightedScores))
  let wScoresortedByMovieId = data.weightedScores.sort((a, b) => {
    return a.movieId - b.movieId
  })
  //   let wScoresortedByMovieId = data.weightedScores
  //   console.log(wScoresortedByMovieId)
  let wScoreIds = []
  let wScoreRatings = []
  let wScoreSims = []
  for (let y = 0, l = wScoresortedByMovieId.length; y < l; y++) {
    if (movIdSet.has(wScoresortedByMovieId[y].movieId)) {
      wScoreIds.push(wScoresortedByMovieId[y].movieId)
      wScoreRatings.push(wScoresortedByMovieId[y].weightedRating)
      wScoreSims.push(wScoresortedByMovieId[y].simScore)
    }
  }
  //   console.log(performance.now() - t1)
  let alreadyCheckedRatingsIndexes = 0 // let j = //

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
        // alreadyCheckedRatingsIndexes = j
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
