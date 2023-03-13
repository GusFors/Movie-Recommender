const { fork } = require('child_process')
const { Worker } = require('worker_threads')
const chunk = require('array-chunk-split')

const recommender = {}

recommender.calcEuclideanScoreA = (userAScores, userBScores) => {
  let sim = 0
  let n = 0

  for (let i = 0, a = userBScores.length; i < a; i++) {
    sim += (userAScores[i] - userBScores[i]) ** 2
    n += 1
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

recommender.getEuclidianSimScoresForUserR = (userId, ratingsData) => {
  let simScores = { userIds: [], scores: [] }

  // let t1 = performance.now()
  let userAMovIds = new Set()
  let userAScores = []
  let aMatchScores = []

  let othersRatingUserIds = []
  let otherScores = []
  let relevantScores = []

  for (let r = 0, l = ratingsData.length; r < l; r++) {
    if (ratingsData[r][0] === userId) {
      aMatchScores.push(ratingsData[r][1])
      userAMovIds.add(ratingsData[r][1])
      userAScores.push(ratingsData[r][2])
    } else {
      relevantScores.push(ratingsData[r])
    }
  }

  let matchesIndexes = []

  for (let r = 0, l = relevantScores.length; r < l; r++) {
    if (userAMovIds.has(relevantScores[r][1])) {
      matchesIndexes.push(aMatchScores.indexOf(relevantScores[r][1]))
      othersRatingUserIds.push(relevantScores[r][0])
      otherScores.push(relevantScores[r][2])
    }
  }

  // let t2 = performance.now()
  let uniqueOtherIds = [...new Set(othersRatingUserIds)]
  let alreadyCheckedRatingsIndexes = 0

  for (let i = 0, u = uniqueOtherIds.length; i < u; i++) {
    let userBScores = []
    let userAScoresFromMatchingIndexes = []

    for (let r = alreadyCheckedRatingsIndexes, l = othersRatingUserIds.length; r < l; r++) {
      if (othersRatingUserIds[r] === uniqueOtherIds[i]) {
        userBScores.push(otherScores[r])
        userAScoresFromMatchingIndexes.push(userAScores[matchesIndexes[r]])
        alreadyCheckedRatingsIndexes++
      } else {
        break
      }
    }

    let simScore = recommender.calcEuclideanScoreA(userAScoresFromMatchingIndexes, userBScores)
    if (simScore > 0) {
      simScores.userIds.push(uniqueOtherIds[i])
      simScores.scores.push(simScore)
    }
  }
  // console.log('second section took', performance.now() - t2)
  simScores.userIds = new Int32Array(simScores.userIds)
  simScores.scores = new Float32Array(simScores.scores)
  return simScores
}

recommender.warmupOpt = (userId, ratingsData) => {
  // prettier-ignore
  %PrepareFunctionForOptimization(recommender.getEuclidianSimScoresForUserR);
  // prettier-ignore
  %PrepareFunctionForOptimization(recommender.calcEuclideanScoreA);
  // prettier-ignore
 // %PrepareFunctionForOptimization(recommender.getWeightedScoresTview);
  // prettier-ignore
  %OptimizeFunctionOnNextCall(recommender.getEuclidianSimScoresForUserR);
  // prettier-ignore
  %OptimizeFunctionOnNextCall(recommender.calcEuclideanScoreA);
  // prettier-ignore
  // %NeverOptimizeFunction(recommender.getWeightedScoresTfull)
  //%OptimizeFunctionOnNextCall(recommender.getWeightedScoresTview);
  // prettier-ignore
  // %DeoptimizeNow();
  //console.log(%GetOptimizationStatus(recommender.getWeightedScoresTfull));
  //%TypedArraySetFastCases(new Int32Array(16));
  //%DeoptimizeFunction(recommender.getWeightedScoresTview);
  let simScores = recommender.getEuclidianSimScoresForUserR(userId, ratingsData)
  let ratings = recommender.getRatingsMoviesNotSeenByUserR(userId, ratingsData)
  recommender.getWeightedScoresTview(simScores, ratings)
  
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

recommender.getRatingsMoviesNotSeenByUserR = (userId, ratingsData) => {
  let moviesSeenByUser = new Set()
  for (let i = 0; i < ratingsData.length; i++) {
    if (ratingsData[i][0] === userId) {
      moviesSeenByUser.add(ratingsData[i][1])
    }
  }

  let ratingsForMoviesNotSeenByUser = { userIds: [], movIds: [], scores: [] }

  for (let y = 0; y < ratingsData.length; y++) {
    if (!moviesSeenByUser.has(ratingsData[y][1])) {
      // ratingsForMoviesNotSeenByUser.push(ratingsData[y])
      ratingsForMoviesNotSeenByUser.userIds.push(ratingsData[y][0])
      ratingsForMoviesNotSeenByUser.movIds.push(ratingsData[y][1])
      ratingsForMoviesNotSeenByUser.scores.push(ratingsData[y][2])
    }
  }

  ratingsForMoviesNotSeenByUser.userIds = new Int32Array(ratingsForMoviesNotSeenByUser.userIds)
  ratingsForMoviesNotSeenByUser.movIds = new Int32Array(ratingsForMoviesNotSeenByUser.movIds)
  ratingsForMoviesNotSeenByUser.scores = new Float32Array(ratingsForMoviesNotSeenByUser.scores)

  return ratingsForMoviesNotSeenByUser
}

recommender.getWeightedScoresTview = (similarityScores, ratingsData) => {
  let weightedScores = []

  // %DebugPrint(similarityScores.userIds)
  let uIds = new Int32Array(similarityScores.userIds.buffer)
  let uIdView = new DataView(similarityScores.userIds.buffer, 0)

  let simScores = new Float32Array(similarityScores.scores.buffer)
  // let sCopy = new Float32Array(simScores.buffer)
  let simScoreView = new DataView(simScores.buffer, 0)
  let ratingUserIds = new Int32Array(ratingsData.userIds.buffer)
  let ratingIdview = new DataView(ratingUserIds.buffer, 0)

  movieIds = new Int32Array(ratingsData.movIds.buffer)
  let moviesIdview = new DataView(movieIds.buffer, 0)

  ratingScores = new Float32Array(ratingsData.scores.buffer)
  let ratingScoreView = new DataView(ratingScores.buffer, 0)

  //  for (let s = 0, l = similarityScores.userIds.length * 4; s < l; s += 4) {
  for (let s = 0, l = uIds.length * 4; s < l; s += 4) {
    // %DeoptimizeNow();
    // * 4 in inner loop makes deopt kick in
    for (let i = 0, r = ratingUserIds.length * 4; i < r; i += 4) {
      if (uIdView.getInt32(s, true) === ratingIdview.getInt32(i, true)) {
        weightedScores.push({
          movieId: moviesIdview.getInt32(i, true),
          weightedRating: simScoreView.getFloat32(s, true) * ratingScoreView.getFloat32(i, true),
          simScore: simScoreView.getFloat32(s, true),
        })
      }
    }
  }
  // %DeoptimizeNow();
  // %DeoptimizeFunction(recommender.getWeightedScoresTview);
  // %DisableOptimizationFinalization();
  %ClearMegamorphicStubCache()
  // console.log('part took', performance.now() - t1)

  return weightedScores
}

recommender.getWeightedScoresTarrBuff = (similarityScores, ratingsData) => {
  let weightedScores = []

  let uIds = new Uint32Array(similarityScores.userIds.buffer)
  let simScores = new Float32Array(similarityScores.scores.buffer)

  let ratingUserIds = new Uint32Array(ratingsData.userIds.buffer)
  let movieIds = new Uint32Array(ratingsData.movIds.buffer)
  let ratingScores = new Float32Array(ratingsData.scores.buffer)

  //  for (let s = 0, l = similarityScores.userIds.length * 4; s < l; s += 4) {
  for (let s = 0, l = similarityScores.userIds.length; s < l; s++) {
    // %DeoptimizeNow();
    // * 4 in inner loop makes deopt kick in
    for (let i = 0, r = ratingsData.userIds.length; i < r; i++) {
      if (uIds[s] === ratingUserIds[i]) {
        weightedScores.push({
          movieId: movieIds[i],
          weightedRating: simScores[s] * ratingScores[i],
          simScore: simScores[s],
        })
      }
    }
  }

  return weightedScores
}

recommender.getWeightedScoresT = (similarityScores, ratingsData) => {
  let weightedScores = []

  //let userIds = new Uint32Array(similarityScores.length) // do this in datareader instead?
  //let userIds = new Array(similarityScores.length)
  let userIds = []
  let simScores = []
  // let userIdView = new DataView(new ArrayBuffer(10000000))
  // let userIdView2 = new DataView(new Uint32Array(2).buffer)
  for (let y = 0, l = similarityScores.userIds.length; y < l; y++) {
    //userIds[y] = similarityScores[y][0]
    // userIds[y] += similarityScores[y][0]
    userIds.push(similarityScores.userIds[y])
    simScores.push(similarityScores.scores[y])
  }
  userIds = new Uint32Array(userIds, 0, userIds.length) // use typed array set? or dataview
  let uIdView = new DataView(userIds.buffer, 0)

  simScores = new Float32Array(simScores, 0, simScores.length)
  let simScoreView = new DataView(simScores.buffer, 0)

  //let ratingUserIds = new Uint32Array(ratingsData.length)
  //let ratingUserIds = new Array(ratingsData.length)
  let ratingUserIds = []

  let movieIds = []
  let ratingScores = []
  for (let y = 0, l = ratingsData.userIds.length; y < l; y++) {
    // ratingUserIds[y] = ratingsData[y][0]
    //ratingUserIds[y] += ratingsData[y][0]
    ratingUserIds.push(ratingsData.userIds[y])
    movieIds.push(ratingsData.movIds[y])
    ratingScores.push(ratingsData.scores[y])
  }
  ratingUserIds = new Uint32Array(ratingUserIds)
  let ratingIdview = new DataView(ratingUserIds.buffer, 0)

  movieIds = new Uint32Array(movieIds)
  let moviesIdview = new DataView(movieIds.buffer, 0)

  ratingScores = new Float32Array(ratingScores, 0, ratingScores.length)
  let ratingScoreView = new DataView(ratingScores.buffer, 0)

  for (let s = 0, l = similarityScores.userIds.length * 4; s < l; s += 4) {
    for (let i = 0, r = ratingsData.userIds.length * 4; i < r; i += 4) {
      // console.log(uIdView.getUint32(s, true))
      if (uIdView.getUint32(s, true) === ratingIdview.getUint32(i, true)) {
        weightedScores.push({
          movieId: moviesIdview.getUint32(i, true),
          weightedRating: simScoreView.getFloat32(s, true) * ratingScoreView.getFloat32(i, true),
          simScore: simScoreView.getFloat32(s, true),
        })
        // alreadyCheckedRatingsIndexes++
      }
    }
  }

  return weightedScores
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

  return weightedScores
}

recommender.getMovieRecommendationWorkerScores = async (weightedScores, moviesData, minNumRatings, numForks) => {
  return new Promise((resolve, reject) => {
    let movieRecommendations = []
    let forkProcesses = numForks

    let moviesChunks = chunk.arrayChunkSplit(moviesData, forkProcesses)
    // let wScoresChunks = chunk.arrayChunkSplit(weightedScores, forkProcesses)
    let promises = []

    console.log('spawning workers....')
    for (let i = 0; i < moviesChunks.length; i++) {
      promises.push(spawnWorker(moviesChunks[i], weightedScores, minNumRatings, i))
      // promises.push(spawnWorker(moviesChunks[i], wScoresChunks[i], minNumRatings, i))
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
    let r1 = performance.now()
    for (let r = 0; r < moviesData.length; r++) {
      let holder = moviesData[r] /// ... or structuredclone? mby not needed
      let newIndex = Math.floor(Math.random() * moviesData.length) // randomize to more evenly distribute ratings across threads since most likely older movies have more ratings
      //let newIndex = Math.floor(Math.random() * moviesData.length) || moviesData.length - r
      moviesData[r] = moviesData[newIndex]
      moviesData[newIndex] = holder
    }

    let moviesChunks = chunk.arrayChunkSplit(moviesData, forkProcesses)

    let movieChunkIds = []
    let wScoresChunks = []
    for (let y = 0; y < moviesChunks.length; y++) {
      if (!movieChunkIds[y]) {
        movieChunkIds[y] = []
      }
      for (let j = 0; j < moviesChunks[y].length; j++) {
        movieChunkIds[y].push(moviesChunks[y][j].movieId)
      }
      movieChunkIds[y] = new Set(movieChunkIds[y])
      wScoresChunks[y] = []
      for (let w = 0; w < weightedScores.length; w++) {
        if (movieChunkIds[y].has(weightedScores[w].movieId)) {
          wScoresChunks[y].push(weightedScores[w])
        }
      }
    }
    console.log('randomize in:', performance.now() - r1)
    let promises = []

    console.log('spawning forks....')
    let t1 = performance.now()
    for (let i = 0; i < moviesChunks.length; i++) {
      promises.push(spawnFork(moviesChunks[i], wScoresChunks[i], minNumRatings, numRatings, i))
      // promises.push(spawnFork(moviesChunks[i], wScoresChunks[i], minNumRatings, numRatings, i))
      // console.log(i, 'push loop', performance.now() - t1)
    }
    let t2 = performance.now()
    console.log('forks spawned after', t2 - t1)

    Promise.all(promises).then((values) => {
      let ti1 = performance.now()
      for (let i = 0; i < values.length; i++) {
        for (let j = 0; j < values[i].length; j++) {
          movieRecommendations.push(values[i][j])
        }
      }
      let t2 = performance.now()
      console.log('put together forks in', t2 - ti1, 'from spawn:', t2 - t1)
      resolve(movieRecommendations)
    })
  })
}

async function spawnFork(moviesData, weightedScores, minNumRatings, numRatings, id) {
  return new Promise((resolve, reject) => {
    let t1 = performance.now()
    let calcScore = fork('./data-utils/scoreCalcSort.js', [], {
      // execArgv: ['--predictable-gc-schedule', '--max-semi-space-size=512', '--allow-natives-syntax'],
      serialization: 'advanced',
    }) // seri json seems to get sent slower but calculated faster
    console.log(id, 'spawned in', performance.now() - t1)

    process.nextTick(() => {
      calcScore.send({ weightedScores: weightedScores, moviesData: moviesData, minNumRatings: minNumRatings, numRatings: numRatings, id: id })
      let t2 = performance.now()
      console.log(`started fork and sent data to id:${id} in `, t2 - t1)
    })

    calcScore.on('message', async (data) => {
      if (data.message === 'done') {
        calcScore.kill()
        return resolve(data.data)
      }
    })
  })
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
  return ratingsForMoviesNotSeenByUser
}

recommender.getRatingsMoviesNotSeenByUserS = (userId, ratingsData) => {
  let moviesSeenByUser = []
  for (let i = 0; i < ratingsData.length; i++) {
    if (ratingsData[i][0] === userId) {
      moviesSeenByUser.push(ratingsData[i][1])
    }
  }

  let ratingsForMoviesNotSeenByUser = []
  let cnt = 0
  for (let i = 0; i < ratingsData.length; i++) {
    // if (ratingsData[i][0] !== userId) {
    let seen = false
    for (let y = 0; y < moviesSeenByUser.length; y++) {
      if (ratingsData[i][1] === moviesSeenByUser[y]) {
        seen = true
      }
    }
    if (!seen) {
      cnt++
      ratingsForMoviesNotSeenByUser.push(ratingsData[i])
    }
  }

  return ratingsForMoviesNotSeenByUser
}

recommender.getEuclidianSimScoresForUser = (userId, usersData, ratingsData) => {
  let simScores = []

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
  }

  let uniqueOtherIds = [...new Set(othersRatingUserIds)]
  // should be possible to ignore those when doing the next userId check?
  // let ref = recommender.calcEuclideanScoreA
  let alreadyCheckedRatingsIndexes = 0
  // let ref = calcEuclideanScoreA
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

module.exports = recommender
