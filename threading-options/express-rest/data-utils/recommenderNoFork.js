const { serialize, deserialize } = require('v8')

const recommender = {}

// super slow when not using parse + stringify or structuredClone with the arrays/objects
recommender.getMovieRecommendationScores = (weightedScores, moviesData, minNumOfRatings = 100, method) => {
  let movieRecommendations = []
  if (method === 'json') {
    weightedScores = JSON.parse(JSON.stringify(weightedScores))
    moviesData = JSON.parse(JSON.stringify(moviesData))
  }

  if (method === 'sc') {
    weightedScores = structuredClone(weightedScores)
    moviesData = structuredClone(moviesData)
  }
  // let wb = serialize(weightedScores)
  // let mb = serialize(moviesData)

  // let wS = deserialize(wb) // JSON.parse(JSON.stringify(weightedScores))
  // let mD = deserialize(mb) //JSON.parse(JSON.stringify(moviesData))

  // let wS = structuredClone(weightedScores) // JSON.parse(JSON.stringify(weightedScores))
  // let mD = structuredClone(moviesData) //JSON.parse(JSON.stringify(moviesData))

  for (let i = 0; i < moviesData.length; i++) {
    if (moviesData[i].numRatings >= minNumOfRatings) {
      let weightedScoreSum = 0
      let simScoreSum = 0

      for (let j = 0; j < weightedScores.length; j++) {
        if (moviesData[i].movieId == weightedScores[j].movieId) {
          weightedScoreSum += weightedScores[j].weightedRating
          simScoreSum += weightedScores[j].simScore
        }
      }

      if (weightedScoreSum > 0) {
        movieRecommendations.push({
          ...moviesData[i],
          recommendationScore: weightedScoreSum / simScoreSum,
        })
      }
    }
  }

  return movieRecommendations
}

module.exports = recommender
