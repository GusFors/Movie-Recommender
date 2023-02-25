const { fork } = require('child_process')
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads')
const chunk = require('array-chunk-split')
const { serialize, deserialize } = require('v8')

const recommender = {}

// calculates the euclidian similarity measurement
recommender.calcEuclideanScore = (userAratings, userBratings) => {
  // console.log(%GetOptimizationStatus(recommender.calcEuclideanScore))
  let sim = 0
  let n = 0

  for (let i = 0; i < userAratings.length; i++) {
    for (let j = 0; j < userBratings.length; j++) {
      // if (i > 5) {
      //   if(!%HaveSameMap(userAratings, userBratings)) {
      //     console.log('not same map----')
      //   }

      // }
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
  // console.log(inv)
  return inv
}

// %OptimizeFunctionOnNextCall(recommender.calcEuclideanScore);
// %GetOptimizationCount(recommender.calcEuclideanScore)

recommender.calcPearsonScore = (userAratings, userBratings) => {
  let sum1 = 0,
    sum2 = 0,
    sum1sq = 0,
    sum2sq = 0,
    pSum = 0,
    n = 0

  for (let i = 0; i < userAratings.length; i++) {
    for (let j = 0; j < userBratings.length; j++) {
      if (userAratings[i].movieId === userBratings[j].movieId) {
        let rA = parseFloat(userAratings[i].rating)
        let rB = parseFloat(userBratings[j].rating)

        sum1 += rA
        sum2 += rB

        sum1sq += rA ** 2
        sum2sq += rB ** 2

        pSum += rA * rB
        n += 1
      }
    }
  }

  if (n === 0) {
    return 0
  }

  let num = pSum - (sum1 * sum2) / n
  let den = Math.sqrt((sum1sq - sum1 ** 2 / n) * (sum2sq - sum2 ** 2 / n))

  return num / den
}

// %NeverOptimizeFunction(recommender.calcEuclideanScore);
let lastMap1
recommender.getEuclidianSimScoresForUser = (userId, usersData, ratingsData) => {
  // console.log(%GetOptimizationStatus(recommender.calcEuclideanScore))
  // console.log(%GetOptimizationStatus(recommender.getEuclidianSimScoresForUser))
  // console.log()
  console.log('id', userId)
  // let tf1 = performance.now()
  let userAratings = ratingsData.filter((rating) => rating.userId === userId)

  let simScores = []

  for (let i = 0; i < usersData.length; i++) {
    if (usersData[i].userId !== userId) {
      //console.log(typeof usersData[i].userId, typeof userId)
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

recommender.warmupOpt = (userId, usersData, ratingsData) => {
  // prettier-ignore
  %PrepareFunctionForOptimization(recommender.getEuclidianSimScoresForUser);
  // prettier-ignore
  recommender.getEuclidianSimScoresForUser(userId, usersData, ratingsData);
  // prettier-ignore
  %OptimizeFunctionOnNextCall(recommender.getEuclidianSimScoresForUser);
}

// %OptimizeFunctionOnNextCall(recommender.getEuclidianSimScoresForUser);

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

      // only include users with similarity > 0
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
  // console.log(%GetOptimizationStatus(recommender.getWeightedScores))
  let weightedScores = []
  // console.log(ratingsData)
  // let total = 0
  for (let s = 0; s < similarityScores.length; s++) {
    for (let i = 0; i < ratingsData.length; i++) {
      if (similarityScores[s].userId === ratingsData[i].userId) {
        // let t1 = performance.now()
        weightedScores.push({
          movieId: ratingsData[i].movieId,
          weightedRating: similarityScores[s].similarity * ratingsData[i].rating,
          simScore: similarityScores[s].similarity,
        })
        // let t2 = performance.now()
        // total += t2 - t1
      }
    }
  }
  //console.log(total)
  return weightedScores
}

recommender.getMovieRecommendationWorkerScores = async (weightedScores, moviesData, minNumRatings, numForks) => {
  return new Promise((resolve, reject) => {
    let movieRecommendations = []
    let forkProcesses = numForks

    let moviesChunks = chunk.arrayChunkSplit(moviesData, forkProcesses)
    let promises = []
    // console.log(forkProcesses, moviesChunks.length)
    // let wb = serialize(weightedScores)
    // let mb = serialize(moviesData)
    console.log('spawning workers....')
    for (let i = 0; i < moviesChunks.length; i++) {
      promises.push(spawnWorker(moviesChunks[i], weightedScores, minNumRatings, i))
    }

    Promise.all(promises).then((values) => {
      for (let i = 0; i < values.length; i++) {
        for (let j = 0; j < values[i].length; j++) {
          movieRecommendations.push(values[i][j])
        }
      }
      resolve(movieRecommendations)
    })
  })
}

async function spawnWorker(moviesData, weightedScores, minNumRatings, id) {
  return new Promise((resolve, reject) => {
    let movieRecommendations = []

    let t1 = performance.now()
    let worker = new Worker('./data-utils/scoreCalcWorker.js', {
      //   workerData: { weightedScores: weightedScores, moviesData: moviesData, minNumRatings: minNumRatings, id: id },
      //  resourceLimits: { stackSizeMb: 1000, codeRangeSizeMb: 1000, maxOldGenerationSizeMb: 1000, maxYoungGenerationSizeMb: 1000 },
    })
    // let shared = serialize({ weightedScores: weightedScores, moviesData: moviesData, minNumRatings: minNumRatings, id: id })
    // worker.postMessage(shared, [shared.buffer])
    worker.postMessage({ weightedScores: weightedScores, moviesData: moviesData, minNumRatings: minNumRatings, id: id })

    let t2 = performance.now()
    console.log(`started worker and sent data to id:${id + 1} in `, t2 - t1)

    worker.on('message', async (data) => {
      if (data.message === 'done') {
        console.log('worker id' + data.id + ' done')
        // movieRecommendations = data.data
        // worker.terminate()
        return resolve(data.data)
      }
    })
  })
}

recommender.getMovieRecommendationForkScores = async (weightedScores, moviesData, minNumRatings, numForks) => {
  return new Promise((resolve, reject) => {
    let movieRecommendations = []

    let forkProcesses = numForks
    let moviesChunks = chunk.arrayChunkSplit(moviesData, forkProcesses)
    let promises = []

    console.log('spawning forks....')
    for (let i = 0; i < moviesChunks.length; i++) {
      promises.push(spawnFork(moviesChunks[i], weightedScores, minNumRatings, i))
    }

    Promise.all(promises).then((values) => {
      for (let i = 0; i < values.length; i++) {
        for (let j = 0; j < values[i].length; j++) {
          movieRecommendations.push(values[i][j])
        }
      }
      resolve(movieRecommendations)
    })
  })
}

async function spawnFork(moviesData, weightedScores, minNumRatings, id) {
  return new Promise((resolve, reject) => {
    let movieRecommendations = []

    let t1 = performance.now()
    let calcScore = fork('./data-utils/scoreCalc.js', [], { execArgv: ['--optimize-for-size', '--allow-natives-syntax'], serialization: 'advanced' })

    calcScore.send({ weightedScores: weightedScores, moviesData: moviesData, minNumRatings: minNumRatings, id: id })
    let t2 = performance.now()
    console.log(`started fork and sent data to id:${id} in `, t2 - t1)

    calcScore.on('message', async (data) => {
      if (data.message === 'done') {
        // console.log('fork id' + data.id + ' done')
        calcScore.kill()
        return resolve(data.data)
      }
    })
  })
}

module.exports = recommender
