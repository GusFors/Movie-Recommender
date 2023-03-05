const { fork } = require('child_process')
const { Worker } = require('worker_threads')
const chunk = require('array-chunk-split')
// const { serialize, deserialize } = require('v8')

const recommender = {}
let avg = []
let iavg = []
recommender.calcEuclideanScore = (userAratings, userBratings) => {
  let sim = 0
  let n = 0
  let t1 = performance.now()
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
  let t2 = performance.now()
  avg.push(t2 - t1)
  return inv
}

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

recommender.getEuclidianSimScoresForUser = (userId, usersData, ratingsData) => {
  // let userAratings = ratingsData.filter((rating) => rating.userId === userId)

  // console.log(%GetOptimizationStatus(recommender.calcEuclideanScore))
  // console.log(%GetOptimizationStatus(recommender.getEuclidianSimScoresForUser))
  let simScores = []

  let first1 = performance.now()
  let userIdRatings = []
  let otherUserRatings = []
  for (let r = 0, l = ratingsData.length; r < l; r++) {
    if (ratingsData[r].userId === userId) {
      userIdRatings.push(ratingsData[r])
    } else {
      otherUserRatings.push(ratingsData[r])
    }
  }

  let first2 = performance.now()
  console.log('first', first2 - first1)

  let outer1 = performance.now()
  for (let i = 0, u = usersData.length; i < u; i++) {
    let userB = []
    for (let r = 0, l = otherUserRatings.length; r < l; r++) {
      if (otherUserRatings[r].userId === usersData[i]) {
        userB.push(otherUserRatings[r])
      }
    }
    let i1 = performance.now()
    let simScore = recommender.calcEuclideanScore(userIdRatings, userB)
    if (simScore > 0) {
      // console.log(usersData[i])
      simScores.push({ userId: usersData[i], similarity: simScore })
    }
    let i2 = performance.now()
    iavg.push(i2 - i1)
  }

  let outer2 = performance.now()
  console.log('outer', outer2 - outer1)

  console.log(
    'avg icalcEu',
    iavg.reduce((partialSum, a) => partialSum + a, 0)
  )
  iavg = []
  // console.log('avglen', avg.length)
  console.log(
    'avg calcEu',
    avg.reduce((partialSum, a) => partialSum + a, 0)
  )
  avg = []

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

recommender.getPearsonSimScoresForUser = (userId, usersData, ratingsData) => {
  let userAratings = ratingsData.filter((rating) => rating.userId === userId)
  let simScores = []

  for (let i = 0; i < usersData.length; i++) {
    if (usersData[i] !== userId) {
      let simScore
      let userBratings = ratingsData.filter((rating) => rating.userId === usersData[i])
      simScore = recommender.calcPearsonScore(userAratings, userBratings)

      if (simScore > 0) {
        simScores.push({ userId: usersData[i], similarity: simScore })
      }
    }
  }
  return simScores
}

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

recommender.getWeightedScores = (similarityScores, ratingsData) => {
  let weightedScores = []

  for (let s = 0, l = similarityScores.length; s < l; s++) {
    for (let i = 0, r = ratingsData.length; i < r; i++) {
      if (similarityScores[s].userId === ratingsData[i].userId) {
        weightedScores.push({
          movieId: ratingsData[i].movieId,
          weightedRating: similarityScores[s].similarity * ratingsData[i].rating,
          simScore: similarityScores[s].similarity,
        })
      }
    }
  }

  return weightedScores
}

recommender.getMovieRecommendationWorkerScores = async (weightedScores, moviesData, minNumRatings, numForks) => {
  return new Promise((resolve, reject) => {
    let movieRecommendations = []
    let forkProcesses = numForks

    let moviesChunks = chunk.arrayChunkSplit(moviesData, forkProcesses)
    let promises = []

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
      execArgv: [''],
      //  resourceLimits: { maxYoungGenerationSizeMb: 1024, stackSizeMb: 8 },
    })

    worker.postMessage({ weightedScores: weightedScores, moviesData: moviesData, minNumRatings: minNumRatings, id: id })

    let t2 = performance.now()
    console.log(`started worker and sent data to id:${id + 1} in `, t2 - t1)

    worker.on('message', async (data) => {
      if (data.message === 'done') {
        console.log('worker id' + data.id + ' done')

        worker.terminate()
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
    let t1 = performance.now()
    for (let i = 0; i < moviesChunks.length; i++) {
      promises.push(spawnFork(moviesChunks[i], weightedScores, minNumRatings, i))
      // console.log('t', i)
    }
    let t2 = performance.now()
    console.log('forks spawned after', t2 - t1)

    Promise.all(promises).then((values) => {
      let t1 = performance.now()
      for (let i = 0; i < values.length; i++) {
        for (let j = 0; j < values[i].length; j++) {
          movieRecommendations.push(values[i][j])
        }
      }
      let t2 = performance.now()
      console.log('put together forks in', t2 - t1)
      resolve(movieRecommendations)
    })
  })
}

async function spawnFork(moviesData, weightedScores, minNumRatings, id) {
  return new Promise((resolve, reject) => {
    let movieRecommendations = []

    let t1 = performance.now()
    let calcScore = fork('./data-utils/scoreCalc.js', [], {
      execArgv: ['--predictable-gc-schedule', '--max-semi-space-size=512', '--allow-natives-syntax'],
      serialization: 'advanced',
    }) // seri json seems to get sent slower but calculated faster

    calcScore.send({ weightedScores: weightedScores, moviesData: moviesData, minNumRatings: minNumRatings, id: id })
    let t2 = performance.now()
    console.log(`started fork and sent data to id:${id} in `, t2 - t1)

    calcScore.on('message', async (data) => {
      if (data.message === 'done') {
        calcScore.kill()
        return resolve(data.data)
      }
    })
  })
}

module.exports = recommender

// let t3 = performance.now()
// let str = JSON.stringify({ weightedScores: weightedScores, moviesData: moviesData, minNumRatings: minNumRatings, id: id })
// let t4 = performance.now()
// console.log('took stringify', t4 - t3)

// for (let i = 0, u = usersData.length; i < u; i++) {
//   // let t1 = performance.now()
//   if (usersData[i] !== userId) {
//     let simScore
//     // let userBratings = ratingsData.filter((rating) => rating.userId === usersData[i])
//     let userB = []
//     for (let r = 0, l = ratingsData.length; r < l; r++) {
//       if (ratingsData[r].userId === usersData[i]) {
//         userB.push(ratingsData[r])
//       }
//     }

//     simScore = recommender.calcEuclideanScore(userAratings, userB)

//     if (simScore > 0) {
//       // console.log(usersData[i])
//       simScores.push({ userId: usersData[i], similarity: simScore })
//     }
//   }
//   // let t2 = performance.now()
//   // avg += t2 - t1
// }

// for (let i = 0, a = userAratings.length; i < a; i++) {
//   for (let j = 0, b = userBratings.length; j < b; j++) {
//     if (userAratings[i].movieId === userBratings[j].movieId) {
//       sim += (userAratings[i].rating - userBratings[j].rating) ** 2
//       n += 1
//     }
//   }
// }

// console.log(avg / usersData.length)

// %OptimizeFunctionOnNextCall(recommender.calcEuclideanScore);
// %GetOptimizationCount(recommender.calcEuclideanScore)
// let shared = serialize({ weightedScores: weightedScores, moviesData: moviesData, minNumRatings: minNumRatings, id: id })
// worker.postMessage(shared, [shared.buffer])
//   workerData: { weightedScores: weightedScores, moviesData: moviesData, minNumRatings: minNumRatings, id: id },
//  resourceLimits: { stackSizeMb: 1000, codeRangeSizeMb: 1000, maxOldGenerationSizeMb: 1000, maxYoungGenerationSizeMb: 1000 },
// console.log(%GetOptimizationStatus(recommender.getWeightedScores))
// %NeverOptimizeFunction(recommender.calcEuclideanScore);
// console.log(%GetOptimizationStatus(recommender.calcEuclideanScore))
// console.log(%GetOptimizationStatus(recommender.getEuclidianSimScoresForUser))
// console.log()
