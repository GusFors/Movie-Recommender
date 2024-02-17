'use strict'

const dataFilterer = {}

dataFilterer.getMoviesSeenByUser = (userId, ratingsDataObj) => {
  let moviesSeenByUser = new Set()

  for (let i = 0, l = ratingsDataObj.u.length; i < l; i++) {
    if (ratingsDataObj.u[i] === userId) {
      moviesSeenByUser.add(ratingsDataObj.m[i])
    }
  }

  return moviesSeenByUser
}

dataFilterer.getIgnoredMovieIds = (userId, ratingsDataObjR) => {
  let ratingsDataObj = ratingsDataObjR
  let ratingsLength = ratingsDataObj.u.length

  let userAMovIdsM = new Map()

  let relevantScoresUserIds = []
  let relevantScoresMovIds = []
  let relevantScoresRatings = []

  for (let r = 0, l = ratingsLength; r < l; r++) {
    if (ratingsDataObj.u[r] === userId) {
      userAMovIdsM.set(ratingsDataObj.m[r], ratingsDataObj.s[r])
    } else {
      relevantScoresUserIds.push(ratingsDataObj.u[r])
      relevantScoresMovIds.push(ratingsDataObj.m[r])
      relevantScoresRatings.push(ratingsDataObj.s[r])
    }
  }

  let othersRatingUserIds = []
  let otherMovIds = []
  let ignoredMovIds = []
  let ignoredUserIds = []

  for (let r = 0, l = relevantScoresMovIds.length; r < l; r++) {
    if (userAMovIdsM.has(relevantScoresMovIds[r])) {
      othersRatingUserIds.push(relevantScoresUserIds[r])
      otherMovIds.push(relevantScoresMovIds[r])
    } else {
      ignoredMovIds.push(relevantScoresMovIds[r])
      ignoredUserIds.push(relevantScoresUserIds[r])
    }
  }

  let othersRatingUserIdsSet = new Set(othersRatingUserIds)
  let movIdsToIgnore = []

  for (let r = 0, l = relevantScoresMovIds.length; r < l; r++) {
    if (!othersRatingUserIdsSet.has(relevantScoresUserIds[r])) {
      movIdsToIgnore.push(relevantScoresMovIds[r])
    }
  }

  return new Set(movIdsToIgnore)
}

dataFilterer.getMovieIdsAboveMinNumRatings = (minNumRatings, moviesData) => {
  let movieIdsAboveMin = []
  for (let i = 0; i < moviesData.length; i++) {
    if (moviesData[i].numRatings >= minNumRatings) {
      movieIdsAboveMin.push(moviesData[i].movieId)
    }
  }
  return movieIdsAboveMin
}

dataFilterer.getFilteredRecommendedUserData = (rawUserRecommendationData, numberOfResults, userNamesAndIds) => {
  let sortedData = rawUserRecommendationData.sort((a, b) => b[1] - a[1]) // [0]: user id, [1]: similarity score
  let numOfResultsData = sortedData.slice(0, numberOfResults)

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
    return combined
  } else {
    numOfResultsData.forEach((user) => {
      user.similarity = parseFloat(user.similarity.toFixed(4))
    })

    return numOfResultsData
  }
}

dataFilterer.getFilteredRecommendedMovieData = (rawMovieRecommendationData, numberOfResults) => {
  // round to recommendation scores to four decimals
  rawMovieRecommendationData.forEach((movie) => {
    movie.recommendationScore = parseFloat(movie.recommendationScore.toFixed(4))
  })

  let sortedScores = rawMovieRecommendationData.sort((a, b) => {
    if (b.numRatings === a.numRatings && b.recommendationScore === a.recommendationScore) {
      return a.movieId - b.movieId
    }

    // if same score, sort by number of ratings
    if (b.recommendationScore === a.recommendationScore) {
      return b.numRatings - a.numRatings
    }

    return b.recommendationScore - a.recommendationScore
  })

  return sortedScores.slice(0, numberOfResults)
}

module.exports = dataFilterer
