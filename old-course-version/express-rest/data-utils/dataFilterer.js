const dataFilterer = {}

dataFilterer.getFilteredRecommendedUserData = (rawUserRecommendationData, numberOfResults, ordered) => {
  let sortedData = rawUserRecommendationData.sort((a, b) => b.similarity - a.similarity)
  let numOfResultsData = sortedData.slice(0, numberOfResults)

  numOfResultsData.forEach((user) => {
    user.similarity = parseFloat(user.similarity.toFixed(4))
  })
  return numOfResultsData
}

dataFilterer.getFilteredRecommendedMovieData = (rawMovieRecommendationData, numberOfResults) => {
  // round to recommendation scores to four decimals
  rawMovieRecommendationData.forEach((movie) => {
    movie.recommendationScore = parseFloat(movie.recommendationScore.toFixed(4))
  })

  let sortedScores = rawMovieRecommendationData.sort((a, b) => {
    // if same score, sort by number of ratings
    if (b.recommendationScore == a.recommendationScore) {
      return b.numRatings - a.numRatings
    }
    return b.recommendationScore - a.recommendationScore
  })

  return sortedScores.slice(0, numberOfResults)
}

module.exports = dataFilterer
