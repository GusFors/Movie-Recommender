const dataFilterer = require('../data-utils/dataFilterer')
const dataReader = require('../data-utils/dataReader')
const dataReaderRev = require('../data-utils/dataReaderRev')
const dataReaderCsv = require('../data-utils/dataReaderCsv')
const recommender = require('../data-utils/recommender')
const stRecommender = require('../data-utils/recommenderNoFork')

const recommendationController = {}

recommendationController.getSimilarUsersById = async (req, res, next) => {
  let isRev = false // Boolean(parseInt(req.query.rev))
  let userId = req.params.id
  userId = parseInt(userId)

  let filteredRecommendations
  let amountOfResults = req.query.results ? req.query.results : '3'
  let chosenSim = req.query.sim ? req.query.sim : 'Euclidian'

  // const userData = await dataReaderRev.getAllUsersId()
  let userData = await dataReaderCsv.getUserIdLineI()
  let ratingsData = await dataReaderCsv.getRatingsLineObj()
  //const ratingsData = await dataReaderRev.getRatings()

  if (chosenSim === 'Euclidian') {
    let rawUserRecommendations = recommender.getEuclidianSimScoresForUser(userId, await userData, await ratingsData)
    // console.log(rawUserRecommendations)
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
let lastMap
;(async () => {
  if (!isOptimized) {
    // const userData = await dataReaderRev.getAllUsersId()
    // // console.log(await userData[0], await userData.length)
    // lastMap = await userData
    // const ratingsData = await dataReaderRev.getRatings()
    // const movieData = await dataReaderRev.getMovies()
    // recommender.warmupOpt(1, await userData, await ratingsData)
    // isOptimized = true
    let userData = await dataReaderCsv.getUserIdLineI()
    let ratingsData = await dataReaderCsv.getRatingsLineObj()
    await dataReaderCsv.getRatingsLineI()
    userData = JSON.parse(JSON.stringify(await userData))
    ratingsData = JSON.parse(JSON.stringify(await ratingsData))
    const movieData = await dataReaderCsv.getMoviesCompleteLineObj()
    recommender.warmupOpt(1, userData, ratingsData)
    isOptimized = true
  }
})()

recommendationController.getMovieRecommendationById = async (req, res, next) => {
  let userId = req.params.id
  userId = parseInt(userId)

  // const userData = await dataReaderRev.getAllUsersId()
  // const ratingsData = await dataReaderRev.getRatings()
  //  const movieData1 = await dataReaderRev.getMovies()

  let userData = await dataReaderCsv.getUserIdLineI()
  let ratingsData = await dataReaderCsv.getRatingsLineObj()
  userData = JSON.parse(JSON.stringify(await userData))
  ratingsData = JSON.parse(JSON.stringify(await ratingsData))
  // let compRatings = await dataReaderRev.getRatings()
  const movieData = await dataReaderCsv.getMoviesCompleteLineObj()

  let filteredRecommendations
  let amountOfResults = req.query.results ? req.query.results : '3'
  let chosenSim = req.query.sim ? req.query.sim : 'Euclidian'
  let minNumRatings = req.query.minratings
  let threads = parseInt(req.query.numthreads) > 0 ? parseInt(req.query.numthreads) : 1
  let type = req.query.type

  let userSimScores
  let t1 = performance.now()
  if (chosenSim === 'Euclidian') {
    userSimScores = recommender.getEuclidianSimScoresForUser(userId, await userData, await ratingsData)
  }

  if (chosenSim === 'Pearson') {
    userSimScores = recommender.getPearsonSimScoresForUser(userId, await userData, await ratingsData)
  }

  let t2 = performance.now()
  console.log(`get${chosenSim}SimScoresForUser`, t2 - t1, 'ms')

  let t3 = performance.now()
  let ratingsMoviesNotSeen = recommender.getRatingsMoviesNotSeenByUser(userId, await ratingsData)
  let t4 = performance.now()
  console.log('getRatingsMoviesNotSeenByUser', t4 - t3, 'ms')

  userSimScores = JSON.parse(JSON.stringify(userSimScores))
  let t5 = performance.now()
  let weightedScores = recommender.getWeightedScores(userSimScores, ratingsMoviesNotSeen)
  let t6 = performance.now()
  console.log('getWeightedScores', t6 - t5, 'ms')

  let t7 = performance.now()
  let rawRecommendations

  if (type === 'Fork') {
    rawRecommendations = await recommender.getMovieRecommendationForkScores(weightedScores, await movieData, minNumRatings, threads)
  }

  if (type === 'Worker') {
    rawRecommendations = await recommender.getMovieRecommendationWorkerScores(weightedScores, await movieData, minNumRatings, threads)
  }

  if (type === 'Slow') {
    rawRecommendations = stRecommender.getMovieRecommendationScores(weightedScores, await movieData, minNumRatings, 'json')
  }

  let t8 = performance.now()

  console.log('getMovieRecommendationScores', t8 - t7, `ms, ${type !== 'Slow' ? `${type}s: ${threads}` : ''}`)
  console.log(`Total time:`, t8 - t1)
  console.log()

  filteredRecommendations = dataFilterer.getFilteredRecommendedMovieData(await rawRecommendations, amountOfResults)

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

// const userData = chosenSim === 'Euclidian' ? await dataReaderRev.getAllUsersId() : await dataReader.getAllUsers()
// const ratingsData = chosenSim === 'Euclidian' ? await dataReaderRev.getRatings() : await dataReader.getRatings()

// console.log(%HaveSameMap(await userData[0], await lastMap[0]))
// let isRev = Boolean(parseInt(req.query.rev))
// if (isRev) {
//   console.log('rev...')
//   // userId = parseInt(userId)
// }

// const userData = isRev ? await dataReaderRev.getAllUsersId() : await dataReader.getAllUsers()
// // console.log(%HaveSameMap(await userData[0], await lastMap[0]))
// const ratingsData = isRev ? await dataReaderRev.getRatings() : await dataReader.getRatings()
// const movieData = isRev ? await dataReaderRev.getMovies() : await dataReader.getMovies()
