// file meant to be forked for faster calculating large amounts of recommendation data
process.on('message', (data) => {
  const minNumOfRatings = data.minNumRatings

  let calcData = []
  for (let i = 0; i < data.moviesData.length; i++) {
    if (data.moviesData[i].numRatings >= minNumOfRatings) {
      let weightedScoreSum = 0
      let simScoreSum = 0

      for (let j = 0; j < data.weightedScores.length; j++) {
        if (data.moviesData[i].movieId == data.weightedScores[j].movieId) {
          weightedScoreSum += data.weightedScores[j].weightedRating
          simScoreSum += data.weightedScores[j].simScore
        }
      }

      if (weightedScoreSum > 0) {
        calcData.push({
          ...data.moviesData[i],
          recommendationScore: weightedScoreSum / simScoreSum, // get the final recommandation score by dividing the sums
        })
      }
    }
  }
  // send the calculated data back to main process
  process.send({ message: 'done', data: calcData })
})

// set to higher timeout to test if different forks are done async
//   if (data.id === 3) {
//     setTimeout(() => {
//       console.log(`fork with id: ${data.id} done`)
//       process.send({ message: 'done', data: calcData })
//     }, 1)
//   } else {
//     console.log(`fork with id: ${data.id} done`)
//     process.send({ message: 'done', data: calcData })
//   }
