const dataFilterer = require('./data-utils/dataFilterer')
const dataReader = require('./data-utils/dataReaderRev')
const recommender = require('./data-utils/recommender')
const recommenderC = require('./data-utils/recommenderConsole')
const stRecommender = require('./data-utils/recommenderNoFork')

async function recommend() {
  const args = process.argv.slice(2)

  const userData = await dataReader.getAllUsers()
  const ratingsData = await dataReader.getRatings()
  const movieData = await dataReader.getMovies()

  let filteredRecommendations
  let amountOfResults = 10
  let chosenSim = 'Euclidian'
  let minNumRatings = 1
  let type = args[0] ? args[0] : 'fork'
  let forks = args[1] ? parseInt(args[1]) : 4
  let userId = 1

  let userSimScores
  let t1 = performance.now()
  if (chosenSim === 'Euclidian') {
    userSimScores = recommender.getEuclidianSimScoresForUser(userId, await userData, await ratingsData)
    console.log(userSimScores.length)
  }

  if (chosenSim === 'Pearson') {
    userSimScores = recommender.getPearsonSimScoresForUser(userId, await userData, await ratingsData)
  }

  let t2 = performance.now()
  console.log(`get${chosenSim}SimScoresForUser`, t2 - t1, 'ms')

  let t3 = performance.now()
  let ratingsMoviesNotSeen = recommender.getRatingsMoviesNotSeenByUser(userId, ratingsData)
  let t4 = performance.now()
  console.log('getRatingsMoviesNotSeenByUser', t4 - t3, 'ms')

  let t5 = performance.now()
  let weightedScores = recommender.getWeightedScores(userSimScores, ratingsMoviesNotSeen)
  let t6 = performance.now()
  console.log('getWeightedScores', t6 - t5, 'ms')

  let t7 = performance.now()
  let rawRecommendations

  if (type === 'fork') {
    rawRecommendations = await recommenderC.getMovieRecommendationForkScores(weightedScores, await movieData, minNumRatings, forks)
  }

  if (type === 'worker') {
    rawRecommendations = await recommenderC.getMovieRecommendationWorkerScores(weightedScores, await movieData, minNumRatings, forks)
  }

  if (type === 'slow') {
    rawRecommendations = stRecommender.getMovieRecommendationScores(weightedScores, await movieData, minNumRatings, 'json')
  }

  let t8 = performance.now()
  console.log(rawRecommendations.length)

  console.log('getMovieRecommendationScores', t8 - t7, `ms, ${type !== 'Slow' ? `${type}s: ${forks}` : ''}`)

  // filteredRecommendations = dataFilterer.getFilteredRecommendedMovieData(await rawRecommendations, amountOfResults)
  // console.log(filteredRecommendations[0])
  // console.log(filteredRecommendations[amountOfResults - 1])
  // console.log()
}

recommend()

// --optimize-for-size  --initial-shared-heap-size= --trace_gc --enable-one-shot-optimization --allow-natives-syntax -trace_opt -trace_deopt // --optimize-for-size seems to make many forks faster, flag implications?
// # Cycle in flag implications:
// --optimize-for-size -> --max-semi-space-size = 1
// --predictable-gc-schedule -> --max-semi-space-size = 4
// #

// --lite-mode --mcpu=... '--predictable-gc-schedule', '--huge-max-old-generation-size', '--always-sparkplug', '--max-opt=4', '--use-largepages=on', '--max-old-space-size=3072', '--max-semi-space-size=2048' --inline-new --fast-forward-schedule --turbo-fast-api-calls
// --predictable-gc-schedule --huge-max-old-generation-size --use-largepages=on --random-gc-interval=10 --gc-experiment-less-compaction --experimental-json-modules --max-old-space-size=128 --max-semi-space-size=2 // less sometimes faster? 
// --turbo-compress-translation-arrays
