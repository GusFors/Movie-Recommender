// older code, used for debugging purposes
const recommender = {}

// calculates the euclidian similarity measurement
recommender.calcEuclideanScore = (userAratings, userBratings) => {
  let sim = 0
  let n = 0

  for (let i = 0; i < userAratings.length; i++) {
    for (let j = 0; j < userBratings.length; j++) {
      if (userAratings[i].movieId === userBratings[j].movieId) {
        sim += (userAratings[i].rating - userBratings[j].rating) ** 2
        n += 1
      }
    }
  }

  if (n === 0) {
    return 0
  }

  let inv = 1 / (1 + sim)

  return inv
}

// calculates the Pearson correlation score
recommender.calcPearsonScore = (userAratings, userBratings) => {
  let sum1 = 0,
    sum2 = 0,
    sum1sq = 0,
    sum2sq = 0,
    pSum = 0,
    n = 0

  userAratings.forEach((ratingA) => {
    userBratings.forEach((ratingB) => {
      if (ratingA.movieId === ratingB.movieId) {
        sum1 += ratingA.rating
        sum2 += ratingB.rating

        sum1sq += ratingA.rating ** 2
        sum2sq += ratingB.rating ** 2

        pSum += ratingA.rating * ratingB.rating
        n += 1
      }
    })
  })

  if (n === 0) {
    return 0
  }

  let num = pSum - (sum1 * sum2) / n

  let den = Math.sqrt((sum1sq - sum1 ** 2 / n) * (sum2sq - sum2 ** 2 / n))

  return num / den
}

// Gets euclidian similarity scores for all the other users for the given userId
recommender.getEuclidianSimScoresForUser = (userId, usersData, ratingsData) => {
  // the given userIds ratings
  let userAratings = ratingsData.filter((rating) => rating.userId === userId)

  let simScores = []

  // Loop through and get similarity scores from all users except the userId
  for (let i = 0; i < usersData.length; i++) {
    if (usersData[i].userId !== userId) {
      // current user to compare against
      let simScore
      let userBratings = ratingsData.filter((rating) => rating.userId === usersData[i].userId)
      simScore = recommender.calcEuclideanScore(userAratings, userBratings)

      if (simScore > 0) {
        simScores.push({ ...usersData[i], similarity: simScore })
      }
    }
  }
  return simScores
}

// Gets Pearson similarity scores for all the other users for the given userId
recommender.getPearsonSimScoresForUser = (userId, usersData, ratingsData) => {
  // the given userIds ratings
  let userAratings = ratingsData.filter((rating) => rating.userId === userId)

  let simScores = []

  // Loop through and get similarity scores from all users except the userId
  for (let i = 0; i < usersData.length; i++) {
    if (usersData[i].userId !== userId) {
      // current user to compare against
      let simScore
      let userBratings = ratingsData.filter((rating) => rating.userId === usersData[i].userId)

      simScore = recommender.calcPearsonScore(userAratings, userBratings)

      if (simScore > 0) {
        simScores.push({ ...usersData[i], similarity: simScore })
      }
    }
  }
  return simScores
}

// Gets ratings from other users on movies not yet seen by the userId
recommender.getRatingsMoviesNotSeenByUser = (userId, ratingsData) => {
  let moviesSeenByUser = ratingsData.filter((rating) => rating.userId === userId)
  let ratingsForMoviesNotSeenByUser = ratingsData.filter((rating) => {
    for (let i = 0; i < moviesSeenByUser.length; i++) {
      if (moviesSeenByUser[i].movieId === rating.movieId) {
        return false
      }
    }
    return true
  })

  return ratingsForMoviesNotSeenByUser
}

// Gets the weighted scores/ratings by using the users similarity scores
recommender.getWeightedScores = (similarityScores, ratingsData) => {
  let weightedScores = []

  similarityScores.forEach((userSimScore) => {
    for (let i = 0; i < ratingsData.length; i++) {
      if (userSimScore.userId === ratingsData[i].userId) {
        weightedScores.push({
          ...ratingsData[i],
          weightedRating: userSimScore.similarity * ratingsData[i].rating,
          simScore: userSimScore.similarity,
        })
      }
    }
  })

  return weightedScores
}

// Gets the final movie recommendations score
recommender.getMovieRecommendationScores = (weightedScores, moviesData) => {
  let movieRecommendations = []
  const minNumOfRatings = 100
  for (let i = 0; i < moviesData.length; i++) {
    let weightedScoreSum = 0
    let simScoreSum = 0

    const t0 = performance.now()
    for (let j = 0; j < weightedScores.length; j++) {
      if (moviesData[i].movieId == weightedScores[j].movieId) {
        weightedScoreSum += weightedScores[j].weightedRating
        simScoreSum += weightedScores[j].simScore
      }
    }
    const t1 = performance.now()

    const t2 = performance.now()
    if (weightedScoreSum > 0) {
      movieRecommendations.push({
        ...moviesData[i],
        recommendationScore: weightedScoreSum / simScoreSum, // get the final recommandation score by dividing the sums
      })
    }
    const t3 = performance.now()
  }
  return movieRecommendations
}

module.exports = recommender
