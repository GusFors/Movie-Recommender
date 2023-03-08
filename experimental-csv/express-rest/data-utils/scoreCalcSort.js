process.on('message', (data) => {
  const minNumOfRatings = data.minNumRatings
  let calcData = []
  // console.log(data.id, 'alive')

  // let sortedByMovieId = data.moviesData.sort((a, b) => a.movieId - b.movieId) // probably already in id order but
  // double check
  //  console.log(sortedByMovieId[0])

  // let moviesAboveMinNumRatings = []
  let movieIds = []
  let movieNumRatings = []
  let movieTitles = []

  let p1 = performance.now()
  for (let y = 0, l = data.moviesData.length; y < l; y++) {
    if (data.moviesData[y].numRatings >= minNumOfRatings) {
      // moviesAboveMinNumRatings.push({
      //   movieId: data.moviesData[y].movieId,
      //   numRatings: data.moviesData[y].numRatings,
      //   title: data.moviesData[y].title,
      // })
      movieIds.push(data.moviesData[y].movieId)
      movieNumRatings.push(data.moviesData[y].numRatings)
      movieTitles.push(data.moviesData[y].title)
    }
  }

  let p2 = performance.now()

  let t1 = performance.now()

  // let wScoresortedByMovieId = JSON.parse(JSON.stringify(data.weightedScores))
  let wScoresortedByMovieId = data.weightedScores

  // let wScoresortedByMovieId = data.weightedScores.sort((a, b) => {
  //   return a.movieId - b.movieId
  // })
  // wScoresortedByMovieId = JSON.parse(JSON.stringify(wScoresortedByMovieId))

  let wScoreIds = []
  let wScoreRatings = []
  let wScoreSims = []
  for (let y = 0, l = wScoresortedByMovieId.length; y < l; y++) {
    wScoreIds.push(wScoresortedByMovieId[y].movieId)
    wScoreRatings.push(wScoresortedByMovieId[y].weightedRating)
    wScoreSims.push(wScoresortedByMovieId[y].simScore)
  }

  // let alreadyCheckedRatingsIndexes = 0 // let j = //
  // let checks = 0

  // let wScores = new Array(movieIds.length)
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
        title: movieTitles[i], // can be wrong index?
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
