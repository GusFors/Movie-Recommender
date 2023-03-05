const { serialize, deserialize } = require('v8')

const recommender = {}

recommender.calcEuclideanScore = (userAratings, userBratings) => {
  let sim = 0
  let n = 0
  // console.log(userAratings)
  // console.log(userBratings)
  // let t1 = performance.now()
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
  // let t2 = performance.now()
  // avg.push(t2 - t1)
  return inv
}

recommender.getEuclidianSimScoresForUser = (userId, usersData, ratingsData) => {
  // let userAratings = ratingsData.filter((rating) => rating.userId === userId)

  // console.log(%GetOptimizationStatus(recommender.calcEuclideanScore))
  // console.log(%GetOptimizationStatus(recommender.getEuclidianSimScoresForUser))
  let simScores = []

  // let first1 = performance.now()
  let userIdRatings = []
  let otherUserRatings = []
  for (let r = 0, l = ratingsData.length; r < l; r++) {
    if (ratingsData[r].userId === userId) {
      userIdRatings.push(ratingsData[r])
    } else {
      otherUserRatings.push(ratingsData[r])
    }
  }

  // let first2 = performance.now()
  // console.log('first', first2 - first1)

  // let outer1 = performance.now()
  for (let i = 0, u = usersData.length; i < u; i++) {
    let userB = []
    for (let r = 0, l = otherUserRatings.length; r < l; r++) {
      if (otherUserRatings[r].userId === usersData[i].userId) {
        userB.push(otherUserRatings[r])
      }
    }
    // let i1 = performance.now()
    let simScore = recommender.calcEuclideanScore(userIdRatings, userB)
    if (simScore > 0) {
      // console.log(usersData[i])
      simScores.push({ userId: usersData[i].userId, similarity: simScore })
    }
    // let i2 = performance.now()
    // iavg.push(i2 - i1)
  }

  // let outer2 = performance.now()
  // console.log('outer', outer2 - outer1)

  // console.log(
  //   'avg icalcEu',
  //   iavg.reduce((partialSum, a) => partialSum + a, 0)
  // )
  // iavg = []
  // // console.log('avglen', avg.length)
  // console.log(
  //   'avg calcEu',
  //   avg.reduce((partialSum, a) => partialSum + a, 0)
  // )
  // avg = []

  return simScores
}

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
        if (moviesData[i].movieId === weightedScores[j].movieId) {
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
