const { fork } = require('child_process')
const { Worker } = require('worker_threads')
const chunk = require('array-chunk-split')

const recommender = {}
let r = []
let avg = []
let iavg = []

recommender.calcEuclideanScore = (userAratings, userBratings) => {
  let sim = 0
  let n = 0

  let t1 = performance.now()
  for (let i = 0, a = userAratings.length; i < a; i++) {
    for (let j = 0, b = userBratings.length; j < b; j++) {
      if (userAratings[i][1] === userBratings[j][1]) {
        sim += (userAratings[i][2] - userBratings[j][2]) ** 2
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

recommender.calcEuclideanScoreA = (userAMovIds, userAScores, userBMovIds, userBScores) => {
  let sim = 0
  let n = 0

  let t1 = performance.now()
  for (let i = 0, a = userAMovIds.length; i < a; i++) {
    for (let j = 0, b = userBMovIds.length; j < b; j++) {
      if (userAMovIds[i] === userBMovIds[j]) {
        sim += (userAScores[i] - userBScores[j]) ** 2
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
  let simScores = []

  let first1 = performance.now()

  let userAMovIds = []
  let userAScores = []

  let otherIds = []
  let otherMovRatIds = []
  let otherScores = []
  for (let r = 0, l = ratingsData.length; r < l; r++) {
    if (ratingsData[r][0] === userId) {
      // userIdRatings.push(ratingsData[r])
      userAMovIds.push(ratingsData[r][1])
      userAScores.push(ratingsData[r][2])
    } else {
      // otherUserRatings.push(ratingsData[r])
      otherIds.push(ratingsData[r][0])
      otherMovRatIds.push(ratingsData[r][1])
      otherScores.push(ratingsData[r][2])
    }
  }

  let first2 = performance.now()
  console.log('first', first2 - first1)

  let outer1 = performance.now()

  for (let i = 0, u = usersData.length; i < u; i++) {
    let i1 = performance.now()
    let userBMovIds = []
    let userBScores = []
    for (let r = 0, l = otherMovRatIds.length; r < l; r++) {
      if (otherIds[r] === usersData[i]) {
        userBMovIds.push(otherMovRatIds[r])
        userBScores.push(otherScores[r])
      }
    }
    let i2 = performance.now()
    iavg.push(i2 - i1)

    let simScore = recommender.calcEuclideanScoreA(userAMovIds, userAScores, userBMovIds, userBScores)
    if (simScore > 0) {
      simScores.push({ userId: usersData[i], similarity: simScore })
    }
  }

  let outer2 = performance.now()
  console.log('outer', outer2 - outer1)

  console.log(
    'avg icalcEu',
    iavg.reduce((partialSum, a) => partialSum + a, 0)
  )
  iavg = []
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
  let moviesSeenByUser = ratingsData.filter((rating) => rating[0] === userId)
  let ratingsForMoviesNotSeenByUser = ratingsData.filter((rating) => {
    for (let i = 0; i < moviesSeenByUser.length; i++) {
      if (moviesSeenByUser[i][1] === rating[1]) {
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
      if (similarityScores[s].userId === ratingsData[i][0]) {
        weightedScores.push({
          movieId: ratingsData[i][1],
          weightedRating: similarityScores[s].similarity * ratingsData[i][2],
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
    let calcScore = fork('./data-utils/scoreCalcArr.js', [], {
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