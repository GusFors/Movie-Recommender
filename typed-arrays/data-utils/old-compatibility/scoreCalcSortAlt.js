process.on('message', (data) => {
  const minNumOfRatings = data.minNumRatings
  let calcData = []

  let t1 = performance.now()
  // let wScoresortedByMovieId = JSON.parse(JSON.stringify(data.weightedScores))

  let wScoresortedByMovieId = data.weightedScores.sort((a, b) => {
    return a.movieId - b.movieId
  })
  // console.log(wScoresortedByMovieId)
  // let sortedData = wScoresortedByMovieId.sort((a, b) => b.movieId - a.movieId)
  // console.log(sortedData)
  let wScoreIds = []
  let wScoreRatings = []
  let wScoreSims = []

  // let currMovIdsCnt = new Array(wScoresortedByMovieId.length)
  let currMovIdsCnt = [0]
  let currentId = wScoresortedByMovieId[0].movieId
  let currentCnt = 0
  let currentIndex = 0
  let uniqueIds = new Set()
  // console.log(wScoresortedByMovieId)
  for (let y = 0, l = wScoresortedByMovieId.length; y < l; y++) {
    uniqueIds.add(wScoresortedByMovieId[y].movieId)
    if (wScoresortedByMovieId[y].movieId !== currentId) {
      currentId = wScoresortedByMovieId[y].movieId
      currentIndex++
      currMovIdsCnt[currentIndex] = 0
    }

    // also check if user already has seen/rated before push, in movies loop?
    currMovIdsCnt[currentIndex] += 1
    wScoreIds.push(wScoresortedByMovieId[y].movieId)
    wScoreRatings.push(wScoresortedByMovieId[y].weightedRating)
    wScoreSims.push(wScoresortedByMovieId[y].simScore)
  }

  let movieIds = []
  let movieNumRatings = []
  let movieTitles = []
  // console.log(uniqueIds)
  for (let y = 0, l = data.moviesData.length; y < l; y++) {
    if (data.moviesData[y].numRatings >= minNumOfRatings) {
      // if (data.moviesData[y].movieId === 1) {
      //   console.log(data.moviesData[y])
      // }

      if (uniqueIds.has(data.moviesData[y].movieId)) {
        movieIds.push(data.moviesData[y].movieId)
        movieNumRatings.push(data.moviesData[y].numRatings)
        movieTitles.push(data.moviesData[y].title)
      }
    }
  }

  let alreadyCheckedRatingsIndexes = 0 // let j = //
  // console.log(data.weightedScores)
  console.log(currMovIdsCnt)
  let c1 = performance.now()
  let cntIndex = 0
  let total = 0
  for (let i = 0, l = movieIds.length; i < l; i++) {
    let weightedScoreSum = 0
    let simScoreSum = 0

    // let currMovId = movieIds[i]
    // let j = currMovIdsCnt[cntIndex - 1] || 0
    // let j = currMovIdsCnt[cntIndex - 1] ? currMovIdsCnt[cntIndex - 1] : 0
    // let j = alreadyCheckedRatingsIndexes + currMovIdsCnt[cntIndex - 1] ? currMovIdsCnt[cntIndex - 1] : 0
    let logg = false
    let loops = 0
    for (let j = alreadyCheckedRatingsIndexes, w = currMovIdsCnt[cntIndex] + alreadyCheckedRatingsIndexes; j < w; j++) {
      // if (i === 0) {
      //   // console.log(currMovIdsCnt[cntIndex])
      // }
      // if (j < 5) {
      //   console.log(w) // 110, 49, 54, 16, 132 , skips some values between?
      // }
      // console.log(w)
      if (!logg && i < 15) {
        console.log(w - alreadyCheckedRatingsIndexes, j)
        logg = true
      }
      // checks++
      // if (movieIds[i] === wScoreIds[j]) {
      //   weightedScoreSum = weightedScoreSum + wScoreRatings[j]
      //   simScoreSum = simScoreSum + wScoreSims[j]
      // }
      // alreadyCheckedRatingsIndexes++
      // loops++
      // // if (movieIds[i] === wScoreIds[j]) {
      weightedScoreSum = weightedScoreSum + wScoreRatings[j]
      simScoreSum = simScoreSum + wScoreSims[j]
      alreadyCheckedRatingsIndexes++
        loops++
      //   // }
    }
    // if(i < 5 ) {
    //   console.log(alreadyCheckedRatingsIndexes, cntIndex, currMovIdsCnt[cntIndex])
    // }
    // alreadyCheckedRatingsIndexes++
    cntIndex++

    if (i < 15) {
      console.log(loops, weightedScoreSum)
    }

    // if (i === 0) {
    //   console.log(movieIds[0], movieTitles[0], movieNumRatings[0], weightedScoreSum / simScoreSum)
    //   console.log(wScoreRatings[0], wScoreSims[0])
    // }
    // if (i === 0) {
    //   console.log(weightedScoreSum / simScoreSum)
    // }
    if (weightedScoreSum > 0) {
      calcData.push({
        movieId: movieIds[i],
        title: movieTitles[i],
        numRatings: movieNumRatings[i],
        recommendationScore: weightedScoreSum / simScoreSum,
      })
    }
    total++
  }

  // for (let i = 0, l = movieIds.length; i < l; i++) {
  //   let weightedScoreSum = 0
  //   let simScoreSum = 0
  //   // let currMovId = movieIds[i]

  //   for (let j = 0, w = wScoreIds.length; j < w; j++) {
  //     // checks++
  //     if (movieIds[i] === wScoreIds[j]) {
  //       weightedScoreSum = weightedScoreSum + wScoreRatings[j]
  //       simScoreSum = simScoreSum + wScoreSims[j]
  //       // alreadyCheckedRatingsIndexes++
  //     }
  //   }

  //   if (weightedScoreSum > 0) {
  //     calcData.push({
  //       movieId: movieIds[i],
  //       title: movieTitles[i],
  //       numRatings: movieNumRatings[i],
  //       recommendationScore: weightedScoreSum / simScoreSum,
  //     })
  //   }
  // }
  let c2 = performance.now()
  let t2 = performance.now()
  // console.log('checks:', checks)
  console.log(total)
  console.log(`fork with id: ${data.id} took ${t2 - t1}ms to calc`, calcData.length, c2 - c1) // (${process.execArgv})

  process.send({ message: 'done', data: calcData })
})
