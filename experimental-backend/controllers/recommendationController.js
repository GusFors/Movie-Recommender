const dataFilterer = require('../data-utils/dataFilterer')
const dataReaderCsv = require('../data-utils/dataReaderCsv')
const recommender = require('../data-utils/arraybuffer-views/recommenderBufferMap')

const recommendationController = {}

recommendationController.getSimilarUsersById = async (req, res, next) => {
  let userId = req.params.id
  userId = parseInt(userId)

  // let filteredRecommendations
  // let amountOfResults = req.query.results ? req.query.results : '3'
  // let chosenSim = req.query.sim ? req.query.sim : 'Euclidian'

  // let userData = await dataReaderCsv.getUserIdLineI()
  // let ratingsData = await dataReaderCsv.getRatingsLineI()

  // if (chosenSim === 'Euclidian') {
  //   let rawUserRecommendations = recommender.getEuclidianSimScoresForUser(userId, await ratingsData)
  //   filteredRecommendations = dataFilterer.getFilteredRecommendedUserData(rawUserRecommendations, amountOfResults, await dataReaderRev.getAllUsers())
  // }

  // if (chosenSim === 'Pearson') {
  //   let rawUserRecommendations = recommender.getPearsonSimScoresForUser(userId, await userData, await ratingsData)
  //   filteredRecommendations = dataFilterer.getFilteredRecommendedUserData(rawUserRecommendations, amountOfResults, await dataReaderRev.getAllUsers())
  // }

  res.status(200).json({
    message: `Similar user recommendations for user with id: ${userId}`,
    similarUsers: [],
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

recommendationController.getMovieRecommendationById = async (req, res, next) => {
  let userId = +req.params.id
  let avgRuns = +req.query.avgruns
  let amountOfResults = req.query.results ? req.query.results : '3'
  let chosenSim = req.query.sim ? req.query.sim : 'Euclidian'
  let minNumRatings = parseInt(req.query.minratings)
  let threads = parseInt(req.query.numthreads) > 0 ? parseInt(req.query.numthreads) : 1
  let type = req.query.type

  let filteredRecommendations
  let rawRecommendations
  for (let i = 0; i < avgRuns; i++) {
    let r1 = performance.now()
    let ratingsData = await dataReaderCsv.getRatingsLineI()
    // let ratingsData = await dataReaderCsv.getRatingsAddon()

    console.log('load ratings in:', performance.now() - r1)
    let m1 = performance.now()
    let movieData = await dataReaderCsv.getMoviesCompleteLineI(minNumRatings, 'Worker', true)
    console.log('load movies in:', performance.now() - m1, '\n')

    let f1 = performance.now()
    let movSeen = recommender.getMoviesSeenByUser(userId, await ratingsData)
    // movieData = movieData.filter((m) => m.numRatings >= minNumRatings && !movSeen.has(m.movieId))
    movieData = movieData.filter((m) => !movSeen.has(m.movieId))
    console.log('filter moviedata in:', performance.now() - f1)

    let t1 = performance.now()
    const userSimScores = recommender.getEuclidianSimScoresForUserR(userId, await ratingsData)

    let t2 = performance.now()
    console.log(`get${chosenSim}SimScoresForUser`, t2 - t1, 'ms')

    let t3 = performance.now()
    // faster with normal ratingsData arrays, convert?
    let ratingsMoviesNotSeen = await recommender.getWeightedScoresMoviesNotSeenByUser(userId, await ratingsData, userSimScores) // check if > minNumRatings?
    let t4 = performance.now()
    console.log('getRatingsMoviesNotSeenByUser', t4 - t3, 'ms')

    let t7 = performance.now()
    // faster with typed ratingsData arrays?
    rawRecommendations = await recommender.getMovieRecommendationScores(ratingsMoviesNotSeen, await movieData, threads, t7)
    let t8 = performance.now()
    console.log('getMovieRecommendationScores', t8 - t7, `ms, ${type !== 'Slow' ? `${type}s: ${threads}` : ''}`)

    console.log(`Total time:`, t8 - t1, '\n')

    filteredRecommendations = dataFilterer.getFilteredRecommendedMovieData(await rawRecommendations, amountOfResults)
  }

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
  // prettier-ignore
  // %CollectGarbage(1);
}
module.exports = recommendationController
