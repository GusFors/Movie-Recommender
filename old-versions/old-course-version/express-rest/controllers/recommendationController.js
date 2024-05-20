const dataFilterer = require('../data-utils/dataFilterer')
const dataReader = require('../data-utils/dataReader')
const recommender = require('../data-utils/recommender')

const recommendationController = {}

recommendationController.getSimilarUsersById = async (req, res, next) => {
  const userData = await dataReader.getAllUsers()
  const ratingsData = await dataReader.getRatings()

  let filteredRecommendations
  let amountOfResults = req.query.results ? req.query.results : '3'
  let chosenSim = req.query.sim ? req.query.sim : 'Euclidian'

  if (chosenSim === 'Euclidian') {
    let rawUserRecommendations = recommender.getEuclidianSimScoresForUser(req.params.id, await userData, await ratingsData)
    filteredRecommendations = dataFilterer.getFilteredRecommendedUserData(rawUserRecommendations, amountOfResults)
  }

  if (chosenSim === 'Pearson') {
    let rawUserRecommendations = recommender.getPearsonSimScoresForUser(req.params.id, await userData, await ratingsData)
    filteredRecommendations = dataFilterer.getFilteredRecommendedUserData(rawUserRecommendations, amountOfResults)
  }

  res.status(200).json({
    message: `Similar user recommendations for user with id: ${req.params.id}`,
    similarUsers: filteredRecommendations,
  })
}

recommendationController.getMovieRecommendationById = async (req, res, next) => {
  const t1 = performance.now()
  const userData = await dataReader.getAllUsers()
  const ratingsData = await dataReader.getRatings()
  const movieData = await dataReader.getMovies()

  let filteredRecommendations
  let amountOfResults = req.query.results ? req.query.results : '3'
  let chosenSim = req.query.sim ? req.query.sim : 'Euclidian'
  let minNumRatings = req.query.minratings
  let forks = parseInt(req.query.numforks) > 0 ? parseInt(req.query.numforks) : 1

  if (chosenSim === 'Euclidian') {
    let euclidianSimScores = recommender.getEuclidianSimScoresForUser(req.params.id, await userData, await ratingsData)
    let ratingsMoviesNotSeen = recommender.getRatingsMoviesNotSeenByUser(req.params.id, ratingsData)
    let weightedScores = recommender.getWeightedScores(euclidianSimScores, ratingsMoviesNotSeen)

    let rawRecommendations = await recommender.getMovieRecommendationScores(weightedScores, await movieData, minNumRatings, forks)
    filteredRecommendations = dataFilterer.getFilteredRecommendedMovieData(await rawRecommendations, amountOfResults)
  }

  if (chosenSim === 'Pearson') {
    let pearsonUserScores = recommender.getPearsonSimScoresForUser(req.params.id, await userData, await ratingsData)
    let ratingsMoviesNotSeen = recommender.getRatingsMoviesNotSeenByUser(req.params.id, await ratingsData)
    let weightedScores = recommender.getWeightedScores(pearsonUserScores, ratingsMoviesNotSeen)

    let rawRecommendations = await recommender.getMovieRecommendationScores(weightedScores, await movieData, minNumRatings, forks)
    filteredRecommendations = dataFilterer.getFilteredRecommendedMovieData(await rawRecommendations, amountOfResults)
  }
  const t2 = performance.now()
  console.log(`recs in:`, t2 - t1, `ms`)

  if (filteredRecommendations.length > 0) {
    res.status(200).json({
      message: `Movie recommendations for user with id: ${req.params.id}`,
      userMovieRecommendations: filteredRecommendations,
    })
  } else {
    res.status(200).json({
      message: `Sucessful, but could not recommend any movies for user with id: ${req.params.id}, possibly because the user has already watched all current ones`,
      userMovieRecommendations: filteredRecommendations,
    })
  }
}

module.exports = recommendationController

// ;(async () => {
//   const userData = await dataReader.getAllUsers()
//   const ratingsData = await dataReader.getRatings()
//   const movieData = await dataReader.getMovies()
//   const userid = '3'
//   let filteredRecommendations
//   let euclidianSimScores = recommender.getEuclidianSimScoresForUser(userid, await userData, await ratingsData)
//   console.log(euclidianSimScores)
//   let ratingsMoviesNotSeen = recommender.getRatingsMoviesNotSeenByUser(userid, ratingsData)
//   console.log(ratingsMoviesNotSeen)
//   let weightedScores = recommender.getWeightedScores(euclidianSimScores, ratingsMoviesNotSeen)
//   console.log(weightedScores)
//   let rawRecommendations = await recommender.getMovieRecommendationScores(weightedScores, await movieData, '0', 4)
//   console.log(rawRecommendations)
//   filteredRecommendations = dataFilterer.getFilteredRecommendedMovieData(await rawRecommendations, '3')
//   console.log(filteredRecommendations)
// })()
