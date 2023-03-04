const dataReader = require('./data-utils/dataReaderCsv')
const recommender = require('./data-utils/recommenderArr')

;(async () => {
  //await dataReader.getMoviesIdLineI()
  let userId = 1
  let userData = await dataReader.getUserIdLineI()
  let ratingsData = await dataReader.getRatingsLineI()

  let userSimScores = recommender.getEuclidianSimScoresForUser(userId, await userData, await ratingsData)
  // console.log(userSimScores)
})()
