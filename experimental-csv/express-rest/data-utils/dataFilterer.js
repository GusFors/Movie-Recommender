const dataFilterer = {}

dataFilterer.getFilteredRecommendedUserData = (rawUserRecommendationData, numberOfResults, userNamesAndIds) => {
  // let sortedData = rawUserRecommendationData.sort((a, b) => b.similarity - a.similarity)
  // let numOfResultsData = sortedData.slice(0, numberOfResults)
  let sortedData = rawUserRecommendationData.sort((a, b) => b[1] - a[1])
  let numOfResultsData = sortedData.slice(0, numberOfResults)
  // let userIdSorted = userNamesAndIds.sort((a, b) => b.id - a.id)
  // console.log(userNamesAndIds)
  //  console.log(rawUserRecommendationData)

  // workaround
  let combined = []

  if (userNamesAndIds) {
    numOfResultsData.forEach((user) => {
      console.log(user)
      let userObj = {
        similarity: parseFloat(user[1].toFixed(4)),
        name: userNamesAndIds[parseInt(user[0]) - 1] ? userNamesAndIds[parseInt(user[0]) - 1].name : 'Only Id',
        userId: user[0],
      }
      combined.push(userObj)
      //user.similarity = parseFloat(user.similarity.toFixed(4))
    })
    //  console.log(combined)
    return combined
  } else {
    numOfResultsData.forEach((user) => {
      user.similarity = parseFloat(user.similarity.toFixed(4))
    })

    return numOfResultsData
  }

  // if (userNamesAndIds) {
  //   numOfResultsData.forEach((user) => {
  //     console.log(user)
  //     let userObj = {
  //       similarity: parseFloat(user.similarity.toFixed(4)),
  //       name: userNamesAndIds[parseInt(user.userId) - 1].name ? userNamesAndIds[parseInt(user.userId) - 1].name : 'Only Id',
  //       userId: user.userId,
  //     }
  //     combined.push(userObj)
  //     //user.similarity = parseFloat(user.similarity.toFixed(4))
  //   })
  //   //  console.log(combined)
  //   return combined
  // } else {
  //   numOfResultsData.forEach((user) => {
  //     user.similarity = parseFloat(user.similarity.toFixed(4))
  //   })

  //   return numOfResultsData
  // }
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
