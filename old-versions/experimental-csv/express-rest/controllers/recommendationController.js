const dataFilterer = require('../data-utils/dataFilterer')
const dataReaderRev = require('../data-utils/dataReaderRev')
const dataReaderCsv = require('../data-utils/dataReaderCsv')
const recommender = require('../data-utils/recommender')
const recommenderOld = require('../data-utils/recommenderNoFork')

const recommendationController = {}

recommendationController.getSimilarUsersById = async (req, res, next) => {
  let userId = req.params.id
  userId = parseInt(userId)

  let filteredRecommendations
  let amountOfResults = req.query.results ? req.query.results : '3'
  let chosenSim = req.query.sim ? req.query.sim : 'Euclidian'

  let userData = await dataReaderCsv.getUserIdLineI()
  let ratingsData = await dataReaderCsv.getRatingsLineI()

  if (chosenSim === 'Euclidian') {
    let rawUserRecommendations = recommender.getEuclidianSimScoresForUser(userId, await userData, await ratingsData)
    filteredRecommendations = dataFilterer.getFilteredRecommendedUserData(rawUserRecommendations, amountOfResults, await dataReaderRev.getAllUsers())
  }

  if (chosenSim === 'Pearson') {
    let rawUserRecommendations = recommender.getPearsonSimScoresForUser(userId, await userData, await ratingsData)
    filteredRecommendations = dataFilterer.getFilteredRecommendedUserData(rawUserRecommendations, amountOfResults, await dataReaderRev.getAllUsers())
  }

  res.status(200).json({
    message: `Similar user recommendations for user with id: ${userId}`,
    similarUsers: filteredRecommendations,
  })
}

let isOptimized = false
;(async () => {
  if (!isOptimized) {
    const runs = 0
    for (let i = 0; i < runs; i++) {
      let userData = await dataReaderCsv.getUserIdLineI()
      let ratingsData = await dataReaderCsv.getRatingsLineI()
      // userData = JSON.parse(JSON.stringify(await userData))
      // ratingsData = JSON.parse(JSON.stringify(await ratingsData))
      const movieData = await dataReaderCsv.getMoviesCompleteLineI()
      recommender.warmupOpt(1, await userData, await ratingsData)
    }
    console.log('opt done')
    isOptimized = true
  }
})()

recommendationController.getMovieRecommendationById = async (req, res, next) => {
  let userId = req.params.id
  userId = parseInt(userId)

  let userData = await dataReaderCsv.getUserIdLineI()
  let ratingsData = await dataReaderCsv.getRatingsLineI()
  // const movieData = await dataReaderCsv.getMoviesIdLineI()
  const movieData = await dataReaderCsv.getMoviesCompleteLineI()

  let filteredRecommendations
  let amountOfResults = req.query.results ? req.query.results : '3'
  let chosenSim = req.query.sim ? req.query.sim : 'Euclidian'
  let minNumRatings = req.query.minratings
  let threads = parseInt(req.query.numthreads) > 0 ? parseInt(req.query.numthreads) : 1
  let type = req.query.type

  let userSimScores
  // userData = JSON.parse(JSON.stringify(await userData))
  // ratingsData = JSON.parse(JSON.stringify(await ratingsData))
  // userData = structuredClone(userData)
  // ratingsData = structuredClone(ratingsData)

  let t1 = performance.now()
  if (chosenSim === 'Euclidian') {
    userSimScores = recommender.getEuclidianSimScoresForUserR(userId, await userData, await ratingsData)
  }

  // if (chosenSim === 'Pearson') {
  //   userSimScores = recommender.getPearsonSimScoresForUser(userId, await userData, await ratingsData)
  // }

  let t2 = performance.now()
  console.log(`get${chosenSim}SimScoresForUser`, t2 - t1, 'ms')

  let t3 = performance.now()
  let ratingsMoviesNotSeen = recommender.getRatingsMoviesNotSeenByUserR(userId, await ratingsData)
  let t4 = performance.now()
  console.log('getRatingsMoviesNotSeenByUser', t4 - t3, 'ms')
  ratingsMoviesNotSeen = JSON.parse(JSON.stringify(ratingsMoviesNotSeen))

  userSimScores = JSON.parse(JSON.stringify(userSimScores))
  let t5 = performance.now()
  let weightedScores = recommender.getWeightedScores(userSimScores, ratingsMoviesNotSeen)
  let t6 = performance.now()
  console.log('getWeightedScores', t6 - t5, 'ms')

  let t7 = performance.now()
  let rawRecommendations

  let numRatings = dataReaderCsv.getMovieNumRatings()
  if (type === 'Fork') {
    rawRecommendations = await recommender.getMovieRecommendationForkScores(weightedScores, await movieData, minNumRatings, numRatings, threads)
  }

  // if (type === 'Worker') {
  //   rawRecommendations = await recommender.getMovieRecommendationWorkerScores(weightedScores, await movieData, minNumRatings, threads)
  // }

  // if (type === 'Slow') {
  //   rawRecommendations = stRecommender.getMovieRecommendationScores(weightedScores, await movieData, minNumRatings, 'json')
  // }

  let t8 = performance.now()

  console.log('getMovieRecommendationScores', t8 - t7, `ms, ${type !== 'Slow' ? `${type}s: ${threads}` : ''}`)
  console.log(`Total time:`, t8 - t1)
  console.log()

  filteredRecommendations = dataFilterer.getFilteredRecommendedMovieData(await rawRecommendations, amountOfResults)

   for (let i = 0; i < filteredRecommendations.length; i++) {
      console.log(`${filteredRecommendations[i].movieId},`)
    }

  if (filteredRecommendations.length > 0) {
    res.status(200).json({
      message: `Movie recommendations for user with id: ${userId}`,
      userMovieRecommendations: filteredRecommendations,
      totalRecommendations: rawRecommendations.length,
    })
  } else {
    res.status(200).json({
      message: `Sucessful, but could not recommend any movies for user with id: ${userId}, possibly because of the user has already watched all current ones`,
      userMovieRecommendations: filteredRecommendations,
    })
  }
}

module.exports = recommendationController
