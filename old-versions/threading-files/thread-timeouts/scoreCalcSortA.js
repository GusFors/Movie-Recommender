'use strict'

// keep alive process so later calls get optimized?
let timeout = setTimeout(() => {
  process.send({ message: 'selftimeout', id: 'unknown' })
  process.exit()
}, 30000)

process.on('message', (data) => {
  clearTimeout(timeout)

  let calcData = []

  let movieIds = []
  let movieNumRatings = []
  let movieTitles = []

  let t1 = performance.now()

  for (let y = 0, l = data.moviesData.length; y < l; y++) {
    movieIds.push(data.moviesData[y].movieId)
    movieNumRatings.push(data.moviesData[y].numRatings)
    movieTitles.push(data.moviesData[y].title)
  }

  let movIdSet = new Set(movieIds)

  let s1 = performance.now()
  let wScoresortedByMovieId = data.weightedScores.sort((a, b) => {
    // sort typed arrays with ids faster?
    return a.movieId - b.movieId
  })
  console.log('sort in:', performance.now() - s1)

  let wScoreIds = []
  let wScoreRatings = []
  let wScoreSims = []
  // let e1 = performance.now()
  for (let y = 0, l = wScoresortedByMovieId.length; y < l; y++) {
    // has check not needed anymore?
    if (movIdSet.has(wScoresortedByMovieId[y].movieId)) {
      wScoreIds.push(wScoresortedByMovieId[y].movieId)
      wScoreRatings.push(wScoresortedByMovieId[y].weightedRating)
      wScoreSims.push(wScoresortedByMovieId[y].simScore)
    }
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

  console.log(`fork with id: ${data.id} took ${t2 - t1}ms to calc`, calcData.length, c2 - c1) // (${process.execArgv})

  process.send({ message: 'done', data: calcData, id: data.id })

  timeout = setTimeout(() => {
    process.send({ message: 'timeout', id: data.id })
    process.exit()
  }, 5000)
})
