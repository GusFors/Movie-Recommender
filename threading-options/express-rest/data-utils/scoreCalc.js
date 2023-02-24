process.on('message', (data) => {
  //let data = JSON.parse(JSON.stringify(mdata)) // doesn't seem to make as much difference when forking compared to workers

  const minNumOfRatings = data.minNumRatings
  let calcData = []

  let t1 = performance.now()
  // let last
  for (let i = 0; i < data.moviesData.length; i++) {
    // let isSameMap = %HaveSameMap(data.moviesData[i], last)
    // if (!isSameMap && i > 0) {
    //   console.log('not same')
    //   console.log(data.moviesData[i], last)
    // }
    // if (i > 0 && i < 5) {
    //   console.log()
    // }
    if (data.moviesData[i].numRatings >= minNumOfRatings) {
      let weightedScoreSum = 0
      let simScoreSum = 0

      for (let j = 0; j < data.weightedScores.length; j++) {
        if (data.moviesData[i].movieId === data.weightedScores[j].movieId) {
          weightedScoreSum += data.weightedScores[j].weightedRating
          simScoreSum += data.weightedScores[j].simScore
        }
      }

      if (weightedScoreSum > 0) {
        calcData.push({
          ...data.moviesData[i],
          recommendationScore: weightedScoreSum / simScoreSum,
        })
      }
     // last = data.moviesData[i]
    }
  }

  let t2 = performance.now()
  console.log(`fork with id: ${data.id} took ${t2 - t1}ms to calc (${process.execArgv})`)

  process.send({ message: 'done', data: calcData, id: data.id })
})
