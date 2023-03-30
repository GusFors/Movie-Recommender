const dataFilterer = require('../data-utils/dataFilterer')
const dataReaderRev = require('../data-utils/old-compatibility/dataReaderRev')
const dataReaderCsv = require('../data-utils/dataReaderCsv')
const recommender = require('../data-utils/arraybuffer-views/recommenderBuffer')

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
    let rawUserRecommendations = recommender.getEuclidianSimScoresForUser(userId, await ratingsData)
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
      // let userData = await dataReaderCsv.getUserIdLineI()
      let ratingsData = await dataReaderCsv.getRatingsLineI()
      // userData = JSON.parse(JSON.stringify(await userData))
      // ratingsData = JSON.parse(JSON.stringify(await ratingsData))
      const movieData = await dataReaderCsv.getMoviesCompleteLineI()
      recommender.warmupOpt(1, await ratingsData)
    }
    console.log('opt done')
    isOptimized = true
  }
})()

// void function () {
// }()

recommendationController.getMovieRecommendationById = async (req, res, next) => {
  let userId = req.params.id
  userId = parseInt(userId)

  let ratingsData = await dataReaderCsv.getRatingsLineI()
  let movieData = await dataReaderCsv.getMoviesCompleteLineI()

  let filteredRecommendations
  let amountOfResults = req.query.results ? req.query.results : '3'
  let chosenSim = req.query.sim ? req.query.sim : 'Euclidian'
  let minNumRatings = parseInt(req.query.minratings)
  let threads = parseInt(req.query.numthreads) > 0 ? parseInt(req.query.numthreads) : 1
  let type = req.query.type

  let userSimScores
  // ratingsData = ratingsData.filter((r) => !ignoredMovIds.has(r.movieId)) // but filter all ratingsData properties and not only id array, or filter in datareader as arg
  let t1 = performance.now()
  if (chosenSim === 'Euclidian') {
    userSimScores = recommender.getEuclidianSimScoresForUserR(userId, await ratingsData)
  }

  let t2 = performance.now()
  console.log(`get${chosenSim}SimScoresForUser`, t2 - t1, 'ms')

  let t3 = performance.now()
  let ratingsMoviesNotSeen = recommender.getWeightedScoresMoviesNotSeenByUser(userId, await ratingsData, userSimScores)
  let t4 = performance.now()
  console.log('getRatingsMoviesNotSeenByUser', t4 - t3, 'ms')

  let t7 = performance.now()
  let rawRecommendations

  let f1 = performance.now()
  let movSeen = recommender.getMoviesSeenByUser(userId, await ratingsData)
  // let ignoredMovIds = recommender.getIgnoredMovieIds(userId, await ratingsData)
  // movieData = movieData.filter((m) => (m.numRatings >= minNumRatings && !movSeen.has(m.movieId)) && !ignoredMovIds.has(m.movieId))
  movieData = movieData.filter((m) => m.numRatings >= minNumRatings && !movSeen.has(m.movieId)) // also filter movies that user has seen?
  console.log('filter in:', performance.now() - f1)

  if (type === 'Fork') {
    rawRecommendations = await recommender.getMovieRecommendationForkScores(ratingsMoviesNotSeen, await movieData, threads, t7)
  }

  if (type === 'Worker') {
    rawRecommendations = await recommender.getMovieRecommendationWorkerScores(ratingsMoviesNotSeen, await movieData, threads)
  }

  let t8 = performance.now()

  console.log('getMovieRecommendationScores', t8 - t7, `ms, ${type !== 'Slow' ? `${type}s: ${threads}` : ''}`)
  console.log(`Total time:`, t8 - t1)
  console.log()

  filteredRecommendations = dataFilterer.getFilteredRecommendedMovieData(await rawRecommendations, amountOfResults)

  if (filteredRecommendations !== undefined) {
    res.status(200).json({
      message: `Movie recommendations for user with id: ${userId}`,
      userMovieRecommendations: filteredRecommendations,
      totalRecommendations: rawRecommendations.length,
    })
  } else {
    res.status(200).json({
      message: `Sucessful, but could not recommend any movies for user with id: ${userId}, possibly because of the user has already watched all current ones`,
      userMovieRecommendations: [],
    })
  }
}
module.exports = recommendationController
