'use strict'

process.on('message', (data) => {
  let calcData = []

  let movieIds = data.moviesData //[]
  // let movieNumRatings = []
  // let movieTitles = []

  let t1 = performance.now()

  let s1 = performance.now()

  // let wScoresortedByMovieId = data.weightedScores.sort((a, b) => {
  //   // sort typed arrays with ids faster?
  //   // return a[0] - b[0]
  //   return a.movieId - b.movieId
  // })

  let wScoresortedByMovieId = data.weightedScores
  console.log('sort in:', performance.now() - s1)

  // let wScoresortedByMovieId = data.weightedScores

  let wScoreIds = []
  let wScoreRatings = []
  let wScoreSims = []
  // let e1 = performance.now()

  for (let y = 0, l = wScoresortedByMovieId.length; y < l; y += 3) {
    wScoreIds.push(wScoresortedByMovieId[y])
    wScoreRatings.push(wScoresortedByMovieId[y + 1])
    wScoreSims.push(wScoresortedByMovieId[y + 2])

    // if(y === l -3) {
    //   console.log('end', wScoresortedByMovieId[y +2])
    // }
  }

  let c1 = performance.now()
  for (let i = 0, l = movieIds.length; i < l; i++) {
    let weightedScoreSum = 0
    let simScoreSum = 0

    for (let j = 0, w = wScoreIds.length; j < w; j++) {
      if (movieIds[i] === wScoreIds[j]) {
        weightedScoreSum = weightedScoreSum + wScoreRatings[j]
        simScoreSum = simScoreSum + wScoreSims[j]
        // alreadyCheckedRatingsIndexes++
      }
    }

    // if (weightedScoreSum > 0) {
    calcData.push({
      movieId: movieIds[i],
      // title: i, // movieTitles[i]
      // numRatings: i, // movieNumRatings[i]
      recommendationScore: weightedScoreSum / simScoreSum > 0 ? weightedScoreSum / simScoreSum : 0,
    })
    // }
  }

  let c2 = performance.now()
  let t2 = performance.now()

  console.log(`fork with id: ${data.id} took ${t2 - t1}ms to calc`, calcData.length, c2 - c1) // (${process.execArgv})
  process.send({ message: 'done', data: calcData, id: data.id })
})
