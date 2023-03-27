'use strict'

// keep alive process so later calls get optimized?
process.on('message', (data) => {
  // setTimeout(() => {
  //   console.log('fork id', data.id)
  //   process.exit()
  // }, 300 * data.id)

  // process.send({ message: 'alive', id: data.id })
  let calcData = []

  let movieIds = []
  let movieNumRatings = []
  let movieTitles = []

  let t1 = performance.now()

  for (let y = 0, l = data.moviesData.length; y < l; y++) {
    // if (data.moviesData[y].numRatings >= minNumOfRatings) {
    movieIds.push(data.moviesData[y])
    // movieTitles.push(data.moviesData[y][1])
    movieNumRatings.push(data.moviesData[y][2])
    // }
  }

  let movIdSet = new Set(movieIds)

  // let wScoresortedByMovieId = JSON.parse(JSON.stringify(data.weightedScores))
  let s1 = performance.now()

  // let wScoresortedByMovieId = data.weightedScores.sort((a, b) => {
  //   // sort typed arrays with ids faster?
  //   // return a[0] - b[0]
  //   return a.movieId - b.movieId
  // })

  let wScoresortedByMovieId = data.weightedScores
  console.log('sort in:', performance.now() - s1)

  //   let wScoresortedByMovieId = data.weightedScores
  //   console.log(wScoresortedByMovieId)
  let wScoreIds = []
  let wScoreRatings = []
  let wScoreSims = []
  // let e1 = performance.now()

  // for (let y = 0, l = wScoresortedByMovieId.length; y < l; y++) {
  //   // has check not needed anymore?
  //   // if (movIdSet.has(wScoresortedByMovieId[y][0])) {
  //   //   wScoreIds.push(wScoresortedByMovieId[y][0])
  //   //   wScoreRatings.push(wScoresortedByMovieId[y][1])
  //   //   wScoreSims.push(wScoresortedByMovieId[y][2])
  //   // }

  //   if (movIdSet.has(wScoresortedByMovieId[y].movieId)) {
  //     wScoreIds.push(wScoresortedByMovieId[y].movieId)
  //     wScoreRatings.push(wScoresortedByMovieId[y].weightedRating)
  //     wScoreSims.push(wScoresortedByMovieId[y].simScore)
  //   }
  // }
  // console.log(wScoresortedByMovieId)
  for (let y = 0, l = wScoresortedByMovieId.length; y < l; y += 3) {
    // has check not needed anymore?
    // if (movIdSet.has(wScoresortedByMovieId[y][0])) {
    //   wScoreIds.push(wScoresortedByMovieId[y][0])
    //   wScoreRatings.push(wScoresortedByMovieId[y][1])
    //   wScoreSims.push(wScoresortedByMovieId[y][2])
    // }

    if (movIdSet.has(wScoresortedByMovieId[y])) {
      wScoreIds.push(wScoresortedByMovieId[y])
      wScoreRatings.push(wScoresortedByMovieId[y + 1])
      wScoreSims.push(wScoresortedByMovieId[y + 2])
    }

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
  // console.log(calcData[calcData.length - 1])
  let c2 = performance.now()
  let t2 = performance.now()

  console.log(`fork with id: ${data.id} took ${t2 - t1}ms to calc`, calcData.length, c2 - c1) // (${process.execArgv})

  process.send({ message: 'done', data: calcData, id: data.id })
})
