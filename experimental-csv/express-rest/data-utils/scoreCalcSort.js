process.on('message', (data) => {
  //let data = JSON.parse(JSON.stringify(mdata)) // doesn't seem to make as much difference when forking compared to workers

  const minNumOfRatings = data.minNumRatings
  let calcData = []
  // console.log(data.id, 'alive')

  // let sortedByMovieId = data.moviesData.sort((a, b) => a.movieId - b.movieId) // probably already in id order but
  // double check
  //  console.log(sortedByMovieId[0])


  let moviesAboveMinNumRatings = []
  let movieIds = []
  let p1 = performance.now()
  for (let y = 0, l = data.moviesData.length; y < l; y++) {
    // if(sortedByMovieId[y].movieId === 1) {
    //   console.log(sortedByMovieId[y])
    // }
    if (data.moviesData[y].numRatings >= minNumOfRatings) {
      moviesAboveMinNumRatings.push({ movieId: data.moviesData[y].movieId, numRatings: data.moviesData[y].numRatings, title: data.moviesData[y].title })
      movieIds.push(data.moviesData[y].movieId)
    }
  }

 
  let p2 = performance.now()

  let t1 = performance.now()
  let wScoresortedByMovieId = data.weightedScores.sort((a, b) => {
    // if(a.movieId === 1) {
    //   console.log(a)
    // }
    // if(b.movieId === 1) {
    //   console.log(b)
    // }
    return a.movieId - b.movieId
  })
  let wScoreIds = []

  for (let y = 0, l = wScoresortedByMovieId.length; y < l; y++) {
    wScoreIds.push(wScoresortedByMovieId[y].movieId)
  }


      // console.log(wScoresortedByMovieId[0])
  let alreadyCheckedRatingsIndexes = 0
  for (let i = 0, l = moviesAboveMinNumRatings.length; i < l; i++) {
    let weightedScoreSum = 0
    let simScoreSum = 0
    let currMovId = moviesAboveMinNumRatings[i]

    for (let j = 0, w = wScoresortedByMovieId.length; j < w; j++) {
      if (movieIds[i] === wScoreIds[j]) {
        weightedScoreSum = weightedScoreSum + wScoresortedByMovieId[j].weightedRating
        simScoreSum = simScoreSum + wScoresortedByMovieId[j].simScore
        alreadyCheckedRatingsIndexes++
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

// calcData.push({
//   ...sortedByMovieId[i],
//   recommendationScore: weightedScoreSum / simScoreSum,
// })
// if (i < 5) {
//   console.log(sortedByMovieId[i])
// }
// sortedByMovieId[i].recommendationScore = weightedScoreSum / simScoreSum
// calcData.push(sortedByMovieId[i])
// let isSameMap = %HaveSameMap(sortedByMovieId[i], last)
// if (!isSameMap && i > 0) {
//   console.log('not same')
//   console.log(sortedByMovieId[i], last)
// }
// if (i > 0 && i < 5) {
//   console.log()
// }
// if (moviesAboveMinNumRatings[i].numRatings >= minNumOfRatings) {
// last = sortedByMovieId[i]
// }
// console.log(sortedByMovieId[0])
