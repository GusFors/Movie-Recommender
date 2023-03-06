const { fork } = require('child_process')
const { Worker } = require('worker_threads')
const chunk = require('array-chunk-split')

const recommender = {}
let r = []
let avg = []
let iavg = []

recommender.calcEuclideanScoreA = (userAScores, userBScores) => {
  let sim = 0
  let n = 0

  for (let i = 0, a = userBScores.length; i < a; i++) {
    // for (let j = 0, b = userBScores.length; j < b; j++) {
    sim += (userAScores[i] - userBScores[i]) ** 2
    n += 1
    // }
  }

  if (n === 0) {
    return 0
  }

  let inv = 1 / (1 + sim)

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
  let simScores = []

  let first1 = performance.now()

  let userAMovIds = []
  let userAScores = []

  let othersRatingUserIds = []
  let otherMovRatIds = []
  let otherScores = []
  let relevantScores = []
  let aIndexes = []

  for (let r = 0, l = ratingsData.length; r < l; r++) {
    if (ratingsData[r][0] === userId) {
      // userIdRatings.push(ratingsData[r])
      userAMovIds.push(ratingsData[r][1])
      userAScores.push(ratingsData[r][2])
      aIndexes.push(r)
    } else {
      relevantScores.push(ratingsData[r])
    }
  }

  let matchesIndexes = []
  for (let r = 0, l = relevantScores.length; r < l; r++) {
    for (let i = 0, a = userAMovIds.length; i < a; i++) {
      if (userAMovIds[i] === relevantScores[r][1]) {
        matchesIndexes.push(i)
        othersRatingUserIds.push(relevantScores[r][0])
        otherMovRatIds.push(relevantScores[r][1])
        otherScores.push(relevantScores[r][2])
      }
    }

    // if (userAMovIds.includes(relevantScores[r][1])) {
    //   othersRatingUserIds.push(relevantScores[r][0])
    //   otherMovRatIds.push(relevantScores[r][1])
    //   otherScores.push(relevantScores[r][2])
    // }
  }

  let uniqueOtherIds = [...new Set(othersRatingUserIds)]

  // should be possible to ignore those when doing the next userId check?
  let alreadyCheckedRatingsIndexes = 0
  for (let i = 0, u = uniqueOtherIds.length; i < u; i++) {
    let i1 = performance.now()
    let userBMovIds = []
    let userBScores = []
    let userAScoresFromMatchingIndexes = []

    for (let r = alreadyCheckedRatingsIndexes, l = othersRatingUserIds.length; r < l; r++) {
      if (othersRatingUserIds[r] === uniqueOtherIds[i]) {
        userBMovIds.push(otherMovRatIds[r])
        userBScores.push(otherScores[r])
        userAScoresFromMatchingIndexes.push(userAScores[matchesIndexes[r]])
        // userAMatchingIndexes.push(user)
        alreadyCheckedRatingsIndexes++
      } else {
        break
      }
    }

    let simScore = recommender.calcEuclideanScoreA(userAScoresFromMatchingIndexes, userBScores)
    if (simScore > 0) {
      simScores.push([uniqueOtherIds[i], simScore])
      //  simScores.push(uniqueOtherIds[i])
      //  simScores.push(simScore)
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
  // does kinda the same as in geteuclidian, move to function?
  let moviesSeenByUser = ratingsData.filter((rating) => rating[0] === userId)
  let ratingsForMoviesNotSeenByUser = ratingsData.filter((rating) => {
    for (let i = 0; i < moviesSeenByUser.length; i++) {
      if (moviesSeenByUser[i][1] === rating[1]) {
        return false
      }
    }
    return true
  })
  // console.log(ratingsForMoviesNotSeenByUser.length)
  return ratingsForMoviesNotSeenByUser
}

recommender.getRatingsMoviesNotSeenByUserS = (userId, ratingsData) => {
  // why does this make fork calcs slower?
  // does kinda the same as in geteuclidian, move to function?

  let ratingsForMoviesNotSeenByUser = []
  for (let i = 0; i < ratingsData.length; i++) {
    if (ratingsData[i][0] !== userId) {
      ratingsForMoviesNotSeenByUser.push(ratingsData[i])
    }
  }

  return ratingsForMoviesNotSeenByUser
}

recommender.getWeightedScores = (similarityScores, ratingsData) => {
  let weightedScores = []
  let alreadyCheckedRatingsIndexes = 0

  let userIds = [] // do this in datareader instead?
  let simScores = []
  for (let y = 0, l = similarityScores.length; y < l; y++) {
    userIds.push(similarityScores[y][0])
    simScores.push(similarityScores[y][1])
  }

  let ratingUserIds = []
  let movieIds = []
  let ratingScores = []
  for (let y = 0, l = ratingsData.length; y < l; y++) {
    ratingUserIds.push(ratingsData[y][0])
    movieIds.push(ratingsData[y][1])
    ratingScores.push(ratingsData[y][2])
  }

  for (let s = 0, l = similarityScores.length; s < l; s++) {
    for (let i = alreadyCheckedRatingsIndexes, r = ratingsData.length; i < r; i++) {
      if (userIds[s] === ratingUserIds[i]) {
        weightedScores.push({
          movieId: movieIds[i],
          weightedRating: simScores[s] * ratingScores[i],
          simScore: simScores[s],
        })
        alreadyCheckedRatingsIndexes++
      }
    }
  }
  // if (similarityScores[s] === ratingsData[i][0]) {
  //   weightedScores.push({
  //     movieId: ratingsData[i][1],
  //     weightedRating: similarityScores[s][s+1] * ratingsData[i][2],
  //     simScore: similarityScores[s][s+1],
  //   })
  // }

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

recommender.getMovieRecommendationForkScores = async (weightedScores, moviesData, minNumRatings, numRatings, numForks) => {
  return new Promise((resolve, reject) => {
    let movieRecommendations = []

    let forkProcesses = numForks
    let moviesChunks = chunk.arrayChunkSplit(moviesData, forkProcesses)
    let promises = []

    console.log('spawning forks....')
    let t1 = performance.now()
    for (let i = 0; i < moviesChunks.length; i++) {
      promises.push(spawnFork(moviesChunks[i], weightedScores, minNumRatings, numRatings, i))
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

async function spawnFork(moviesData, weightedScores, minNumRatings, numRatings, id) {
  return new Promise((resolve, reject) => {
    let movieRecommendations = []

    let t1 = performance.now()
    let calcScore = fork('./data-utils/scoreCalcArr.js', [], {
      execArgv: ['--predictable-gc-schedule', '--max-semi-space-size=512', '--allow-natives-syntax'],
      serialization: 'advanced',
    }) // seri json seems to get sent slower but calculated faster

    calcScore.send({ weightedScores: weightedScores, moviesData: moviesData, minNumRatings: minNumRatings, numRatings: numRatings, id: id })
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

// console.log(userAScores.length, userBScores.length)
// console.log(userAScores.length * userBScores.length)
// n *= userAScores.length * userBScores.length ** 2
// sim *= userAScores.length * userBScores.length ** 2
// let commonRatings = []

// for (let b = 0; b < userAScores.length; b++) {
//   if (userBScores.includes(userAScores[b])) {
//     commonRatings.push(userAScores[b])
//   }
// }

// console.log(commonRatings.length)

// // let t1 = performance.now()

// for (let i = 0, a = commonRatings.length; i < a; i++) {
//   sim += (userAScores[i] - userBScores[i]) ** 2
//   n += 1
// }
