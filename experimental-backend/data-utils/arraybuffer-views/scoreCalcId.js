'use strict'

process.on('message', (data) => {
  let calcData = []

  let t1 = performance.now()

  let c1 = performance.now()

  for (let i = 0; i < data.weightedScores.length; i++) {
    let weightedScoreSum = 0
    let simScoreSum = 0
    let floatView = new Float32Array(data.weightedScores[i])
    let int32View = new Int32Array(data.weightedScores[i])
    let id
    for (let j = 0; j < floatView.length; j += 3) {
      if (j === 0) {
        id = int32View[j]
      }
      weightedScoreSum = weightedScoreSum + floatView[j + 1]
      simScoreSum = simScoreSum + floatView[j + 2]
    }

    calcData.push({
      movieId: new Int32Array(data.weightedScores[i])[0],
      // title: i, // movieTitles[i]
      // numRatings: i, // movieNumRatings[i]
      recommendationScore: typeof (weightedScoreSum / simScoreSum) === 'number' ? weightedScoreSum / simScoreSum : 0,
    })
  }

  let c2 = performance.now()
  let t2 = performance.now()

  console.log(`fork with id: ${data.id} took ${t2 - t1}ms to calc`, calcData.length, c2 - c1) // (${process.execArgv})
  process.send({ message: 'done', data: calcData, id: data.id })
})
