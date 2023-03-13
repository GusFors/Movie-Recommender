const { fork } = require('child_process')
const { Worker } = require('worker_threads')
const chunk = require('array-chunk-split')
const { serialize, deserialize } = require('v8')
const os = require('node:os')
const { Buffer } = require('node:buffer')

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
  // %PrepareFunctionForOptimization(recommender.getWeightedScoresTfull);
  // prettier-ignore
  %OptimizeFunctionOnNextCall(recommender.getEuclidianSimScoresForUserR);
  // prettier-ignore
  %OptimizeFunctionOnNextCall(recommender.calcEuclideanScoreA);
  // prettier-ignore
  // %NeverOptimizeFunction(recommender.getWeightedScoresTfull)
  // %OptimizeFunctionOnNextCall(recommender.getWeightedScoresTfull);
  // prettier-ignore
  //console.log(%GetOptimizationStatus(recommender.getWeightedScoresTfull));
  //%TypedArraySetFastCases(new Int32Array(16));
  let simScores = recommender.getEuclidianSimScoresForUserR(userId, ratingsData)
  let ratings = recommender.getRatingsMoviesNotSeenByUserR(userId, ratingsData)
  recommender.getWeightedScoresTfull(simScores, ratings)
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

let V8OptimizationStatus = {
  kIsFunction: 1 << 0,
  kNeverOptimize: 1 << 1,
  kAlwaysOptimize: 1 << 2,
  kMaybeDeopted: 1 << 3,
  kOptimized: 1 << 4,
  kMaglevved: 1 << 5,
  kTurboFanned: 1 << 6,
  kInterpreted: 1 << 7,
  kMarkedForOptimization: 1 << 8,
  kMarkedForConcurrentOptimization: 1 << 9,
  kOptimizingConcurrently: 1 << 10,
  kIsExecuting: 1 << 11,
  kTopmostFrameIsTurboFanned: 1 << 12,
  kLiteMode: 1 << 13,
  kMarkedForDeoptimization: 1 << 14,
  kBaseline: 1 << 15,
  kTopmostFrameIsInterpreted: 1 << 16,
  kTopmostFrameIsBaseline: 1 << 17,
  kIsLazy: 1 << 18,
  kTopmostFrameIsMaglev: 1 << 19,
}

// {
//   kIsFunction: 1,
//   kNeverOptimize: 2,
//   kAlwaysOptimize: 4,
//   kMaybeDeopted: 8,
//   kOptimized: 16,
//   kMaglevved: 32,
//   kTurboFanned: 64,
//   kInterpreted: 128,
//   kMarkedForOptimization: 256,
//   kMarkedForConcurrentOptimization: 512,
//   kOptimizingConcurrently: 1024,
//   kIsExecuting: 2048,
//   kTopmostFrameIsTurboFanned: 4096,
//   kLiteMode: 8192,
//   kMarkedForDeoptimization: 16384,
//   kBaseline: 32768,
//   kTopmostFrameIsInterpreted: 65536,
//   kTopmostFrameIsBaseline: 131072,
//   kIsLazy: 262144,
//   kTopmostFrameIsMaglev: 524288
// }

recommender.getWeightedScoresTfull = (similarityScores, ratingsData) => {
  return getWeightedScoresTfull(similarityScores, ratingsData)
  let weightedScores = []
  // prettier-ignore
  // console.log(%GetOptimizationStatus(recommender.getWeightedScoresTfull) & V8OptimizationStatus.kTurboFanned);
  // prettier-ignore
  let status = %GetOptimizationStatus(recommender.getWeightedScoresTfull);
  // prettier-ignore
  %DebugPrint(recommender.getWeightedScoresTfull);
  console.log(status)
  // %DisableOptimizationFinalization();
  //console.log(%GetOptimizationStatus(recommender.getWeightedScoresTfull));
  // console.log(V8OptimizationStatus)
  // %FinalizeOptimization();
  // prettier-ignore
  // %DeoptimizeNow();

  // for (const [key, value] of Object.entries(V8OptimizationStatus)) {
  //   console.log(`${key}: ${value & status}`);
  // }

  // console.log(%GetOptimizationStatus(recommender.getWeightedScoresTfull));
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
  // prettier-ignore
  // console.log(%HasHoleyElements());
  //console.log(%HasFastElements([]));
  // userIds = new Int32Array(similarityScores.userIds.buffer)
  // userIds = new Int32Array(userIds) // use typed array set? or dataview
  let uIdView = new DataView(similarityScores.userIds.buffer, 0)
  // prettier-ignore
  // console.log(%HasFixedInt32Elements(similarityScores.userIds));
  simScores = new Float32Array(similarityScores.scores.buffer)
  let sCopy = new Float32Array(simScores.buffer)
  // simScores = new Float32Array(simScores)
  let simScoreView = new DataView(simScores.buffer, 0)
  // prettier-ignore
  // %DeoptimizeNow();
  //console.log(%IsSameHeapObject(simScores, sCopy));
  //  console.log(%HasFixedFloat32Elements(simScores));
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
  ratingUserIds = new Int32Array(ratingUserIds)
  let ratingIdview = new DataView(ratingUserIds.buffer, 0)

  movieIds = new Int32Array(movieIds)
  let moviesIdview = new DataView(movieIds.buffer, 0)

  ratingScores = new Float32Array(ratingScores, 0, ratingScores.length)
  let ratingScoreView = new DataView(ratingScores.buffer, 0)

  for (let s = 0, l = similarityScores.userIds.length * 4; s < l; s += 4) {
    // %DeoptimizeNow();
    for (let i = 0, r = ratingsData.userIds.length * 4; i < r; i += 4) {
      // console.log(uIdView.getUint32(s, true))
      if (uIdView.getInt32(s, true) === ratingIdview.getInt32(i, true)) {
        weightedScores.push({
          movieId: moviesIdview.getInt32(i, true),
          weightedRating: simScoreView.getFloat32(s, true) * ratingScoreView.getFloat32(i, true),
          simScore: simScoreView.getFloat32(s, true),
        })
        // alreadyCheckedRatingsIndexes++
      }
    }
  }

  // console.log('part took', performance.now() - t1)
  // console.log(weightedScores)
  return weightedScores
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

  // console.log('part took', performance.now() - t1)

  return weightedScores
}

recommender.getWeightedScoresTarrBuff = (similarityScores, ratingsData) => {
  let weightedScores = []
  // let similarityScores2 = structuredClone(similarityScores, { transfer: [similarityScores.userIds.buffer, similarityScores.scores.buffer] })
  // let ratingsData2 = structuredClone(ratingsData, { transfer: [ratingsData.userIds.buffer, ratingsData.movIds.buffer, ratingsData.scores.buffer] })
  // let similarityScores2 = structuredClone(similarityScores, { transfer: [similarityScores.userIds.buffer, similarityScores.scores.buffer] })
  // let ratingsData2 = structuredClone(ratingsData, { transfer: [ratingsData.userIds.buffer, ratingsData.movIds.buffer, ratingsData.scores.buffer] })
  
  let uIds = new Uint32Array(similarityScores.userIds.buffer)
  // let uIdView = new DataView(similarityScores.userIds.buffer, 0)
  // console.log(uIds)
  let simScores = new Float32Array(similarityScores.scores.buffer)
  // let sCopy = new Float32Array(simScores.buffer)
  // let simScoreView = new DataView(simScores.buffer, 0)
  let ratingUserIds = new Uint32Array(ratingsData.userIds.buffer)
  // let ratingIdview = new DataView(ratingUserIds.buffer, 0)
  // console.log(ratingUserIds)
  let movieIds = new Uint32Array(ratingsData.movIds.buffer)
  // let moviesIdview = new DataView(movieIds.buffer, 0)

  let ratingScores = new Float32Array(ratingsData.scores.buffer)
  // let ratingScoreView = new DataView(ratingScores.buffer, 0)
  // let t1 = performance.now()
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
  
  // %DebugPrint(similarityScores.userIds)
  // let uIds = new Int32Array(similarityScores2.userIds.buffer)
  // // let uIdView = new DataView(similarityScores.userIds.buffer, 0)
  // // console.log(uIds)
  // let simScores = new Float32Array(similarityScores2.scores.buffer)
  // // let sCopy = new Float32Array(simScores.buffer)
  // // let simScoreView = new DataView(simScores.buffer, 0)
  // let ratingUserIds = new Int32Array(ratingsData2.userIds.buffer)
  // // let ratingIdview = new DataView(ratingUserIds.buffer, 0)
  // // console.log(ratingUserIds)
  // let movieIds = new Int32Array(ratingsData2.movIds.buffer)
  // // let moviesIdview = new DataView(movieIds.buffer, 0)

  // let ratingScores = new Float32Array(ratingsData2.scores.buffer)
  // // let ratingScoreView = new DataView(ratingScores.buffer, 0)
  // // let t1 = performance.now()
  // //  for (let s = 0, l = similarityScores.userIds.length * 4; s < l; s += 4) {
  // for (let s = 0, l = uIds.length; s < l; s++) {
  //   // %DeoptimizeNow();
  //   // * 4 in inner loop makes deopt kick in
  //   for (let i = 0, r = ratingUserIds.length; i < r; i++) {
  //     if (uIds[s] === ratingUserIds[i]) {
  //       weightedScores.push({
  //         movieId: movieIds[i],
  //         weightedRating: simScores[s] * ratingScores[i],
  //         simScore: simScores[s],
  //       })
  //     }
  //   }
  // }

  //  console.log('part took', performance.now() - t1)

  return weightedScores
}

function getWeightedScoresTfull(similarityScores, ratingsData) {
  let weightedScores = []

  // %DebugPrint(similarityScores.userIds)
  let uIdView = new DataView(similarityScores.userIds.buffer, 0)

  let simScores = new Float32Array(similarityScores.scores.buffer)
  // let sCopy = new Float32Array(simScores.buffer)
  let simScoreView = new DataView(simScores.buffer, 0)
  let ratingUserIds = []

  ratingUserIds = new Int32Array(ratingsData.userIds.buffer)
  let ratingIdview = new DataView(ratingUserIds.buffer, 0)

  movieIds = new Int32Array(ratingsData.movIds.buffer)
  let moviesIdview = new DataView(movieIds.buffer, 0)

  ratingScores = new Float32Array(ratingsData.scores.buffer)
  let ratingScoreView = new DataView(ratingScores.buffer, 0)

  for (let s = 0, l = similarityScores.userIds.length * 4; s < l; s += 4) {
    // %DeoptimizeNow();
    for (let i = 0, r = ratingsData.userIds.length * 4; i < r; i += 4) {
      if (uIdView.getInt32(s, true) === ratingIdview.getInt32(i, true)) {
        weightedScores.push({
          movieId: moviesIdview.getInt32(i, true),
          weightedRating: simScoreView.getFloat32(s, true) * ratingScoreView.getFloat32(i, true),
          simScore: simScoreView.getFloat32(s, true),
        })
      }
    }
  }

  // console.log('part took', performance.now() - t1)

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

  // console.log('part took', performance.now() - t1)
  // console.log(weightedScores)
  return weightedScores
}

recommender.getWeightedScoresTarr = (similarityScores, ratingsData) => {
  let weightedScores = []

  // let uidBuf = new ArrayBuffer(640 * 4)
  // console.log(similarityScores)
  // console.log(ratingsData)
  let userIds = [...similarityScores.userIds]
  let simScores = [...similarityScores.scores]

  // let simScores = new Float64Array([...similarityScores.scores])
  // let userIds = new Int32Array(similarityScores.length)

  // let simScores = new Float32Array(similarityScores.length)

  // for (let y = 0, l = similarityScores.length; y < l; y++) {
  //   userIds[y] = similarityScores[y][0]
  //   // userIds[y] += similarityScores[y][0]
  //   // userIds.push(similarityScores[y][0])
  //   // simScores.push(similarityScores[y][1])
  //   simScores[y] = similarityScores[y][1]
  // }
  // console.log(userIds)
  // console.log(serialize(userIds).values)
  // for (const value of serialize(userIds).values()) {
  //   console.log(value);
  // }
  // let uIdBuf = new Int16Array(userIds)
  //  console.log(uIdBuf[253])
  // const userIdsT = new Uint32Array([...userIds]) // use typed array set? or dataview

  // simScores = new Float64Array(simScores, 0, simScores.length)

  //let ratingUserIds = new Uint32Array(ratingsData.length)
  //let ratingUserIds = new Array(ratingsData.length)

  let ratingUserIds = [...ratingsData.userIds]
  let movieIds = [...ratingsData.movIds]
  let ratingScores = [...ratingsData.scores]
  // ratingUserIds.fill(1)
  // let movieIds = new Uint32Array([...ratingsData.movIds])
  // let ratingScores = new Float64Array([...ratingsData.scores])

  // let ratingUserIds = new Int32Array(ratingsData.length)
  // // ratingUserIds.fill(1)
  // let movieIds = new Uint32Array(ratingsData.length)
  // let ratingScores = new Float32Array(ratingsData.length)
  // for (let y = 0, l = ratingsData.length; y < l; y++) {
  //   ratingUserIds[y] = ratingsData[y][0]
  //   movieIds[y] = ratingsData[y][1]
  //   ratingScores[y] = ratingsData[y][2]
  //   //ratingUserIds[y] += ratingsData[y][0]
  //   // ratingUserIds.push(ratingsData[y][0])
  //   // movieIds.push(ratingsData[y][1])
  //   // ratingScores.push(ratingsData[y][2])
  // }
  // let ratingUidbuf = Buffer.from(ratingUserIds)
  // const ratingUserIdsT = new Uint32Array([...ratingUserIds])

  // movieIds = new Uint32Array(movieIds)

  // ratingScores = new Float64Array(ratingScores, 0, ratingScores.length)

  // console.log(ratingUserIds.buffer)
  // let t1 = performance.now()
  // console.log(ratingsData.length)
  //  let cnt = 0
  // let uvals = userIds.values()
  // let rvals = ratingUserIds.values()
  // // for (const s of uvals) {
  // //   // console.log(s)
  // //   for (const i of rvals) {
  // //     if (userIds[s] === ratingUserIds[i]) {
  // //       weightedScores.push({
  // //         movieId: movieIds[i],
  // //         weightedRating: simScores[s] * ratingScores[i],
  // //         simScore: simScores[s],
  // //       })
  // //       // alreadyCheckedRatingsIndexes++
  // //     }
  // //     //  cnt++
  // //   }
  // // }
  // for (let s = 0, l = userIds.length; s < l; s++) {
  //   // ratingUserIds.forEach((e) => {
  //   //   cnt++
  //   // })
  //   ratingUserIds.every((e) => {
  //     // cnt++
  //     return e > 0
  //   })
  //   // for (let r of rvals) {
  //   //   // console.log(r)
  //   //   cnt++
  //   // }
  //   // for (const i of rvals) {
  //   //   cnt++
  //   // }
  // }

  for (let s = 0, l = userIds.length; s < l; s++) {
    for (let i = 0, r = ratingUserIds.length; i < r; i++) {
      // console.log(uIdView.getUint32(s, true))
      if (userIds[s] === ratingUserIds[i]) {
        weightedScores.push({
          movieId: movieIds[i],
          weightedRating: simScores[s] * ratingScores[i],
          simScore: simScores[s],
        })
        // alreadyCheckedRatingsIndexes++
      }
    }
  }

  // console.log('part took', performance.now() - t1)

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

    // if (userAMovIds.includes(relevantScores[r][1])) {
    //   othersRatingUserIds.push(relevantScores[r][0])
    //   otherMovRatIds.push(relevantScores[r][1])
    //   otherScores.push(relevantScores[r][2])
    // }
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

    // let simScore = ref(userAScoresFromMatchingIndexes, userBScores)
    let simScore = recommender.calcEuclideanScoreA(userAScoresFromMatchingIndexes, userBScores)
    if (simScore > 0) {
      simScores.push([uniqueOtherIds[i], simScore])
      //  simScores.push(uniqueOtherIds[i])
      //  simScores.push(simScore)
    }
  }

  return simScores
}

// recommender.getWeightedScoresTarr2 = (similarityScores, ratingsData) => {
//   let weightedScores = []

//   // let uidBuf = new ArrayBuffer(640 * 4)
//   // console.log(similarityScores)
//   // console.log(ratingsData)
//   let userIds = [...similarityScores.ids]
//   let simScores = [...similarityScores.scores]

//   // let simScores = new Float64Array([...similarityScores.scores])
//   // let userIds = new Int32Array(similarityScores.length)

//   // let simScores = new Float32Array(similarityScores.length)

//   // for (let y = 0, l = similarityScores.length; y < l; y++) {
//   //   userIds[y] = similarityScores[y][0]
//   //   // userIds[y] += similarityScores[y][0]
//   //   // userIds.push(similarityScores[y][0])
//   //   // simScores.push(similarityScores[y][1])
//   //   simScores[y] = similarityScores[y][1]
//   // }
//   // console.log(userIds)
//   // console.log(serialize(userIds).values)
//   // for (const value of serialize(userIds).values()) {
//   //   console.log(value);
//   // }
//   // let uIdBuf = new Int16Array(userIds)
//   //  console.log(uIdBuf[253])
//   // const userIdsT = new Uint32Array([...userIds]) // use typed array set? or dataview

//   // simScores = new Float64Array(simScores, 0, simScores.length)

//   //let ratingUserIds = new Uint32Array(ratingsData.length)
//   //let ratingUserIds = new Array(ratingsData.length)

//   let ratingUserIds = [...ratingsData.userIds]
//   let movieIds = [...ratingsData.movIds]
//   let ratingScores = [...ratingsData.scores]
//   // ratingUserIds.fill(1)
//   // let movieIds = new Uint32Array([...ratingsData.movIds])
//   // let ratingScores = new Float64Array([...ratingsData.scores])

//   // let ratingUserIds = new Int32Array(ratingsData.length)
//   // // ratingUserIds.fill(1)
//   // let movieIds = new Uint32Array(ratingsData.length)
//   // let ratingScores = new Float32Array(ratingsData.length)
//   // for (let y = 0, l = ratingsData.length; y < l; y++) {
//   //   ratingUserIds[y] = ratingsData[y][0]
//   //   movieIds[y] = ratingsData[y][1]
//   //   ratingScores[y] = ratingsData[y][2]
//   //   //ratingUserIds[y] += ratingsData[y][0]
//   //   // ratingUserIds.push(ratingsData[y][0])
//   //   // movieIds.push(ratingsData[y][1])
//   //   // ratingScores.push(ratingsData[y][2])
//   // }
//   // let ratingUidbuf = Buffer.from(ratingUserIds)
//   // const ratingUserIdsT = new Uint32Array([...ratingUserIds])

//   // movieIds = new Uint32Array(movieIds)

//   // ratingScores = new Float64Array(ratingScores, 0, ratingScores.length)

//   // console.log(ratingUserIds.buffer)
//   // let t1 = performance.now()
//   // console.log(ratingsData.length)
//   //  let cnt = 0
//   // let uvals = userIds.values()
//   // let rvals = ratingUserIds.values()
//   // // for (const s of uvals) {
//   // //   // console.log(s)
//   // //   for (const i of rvals) {
//   // //     if (userIds[s] === ratingUserIds[i]) {
//   // //       weightedScores.push({
//   // //         movieId: movieIds[i],
//   // //         weightedRating: simScores[s] * ratingScores[i],
//   // //         simScore: simScores[s],
//   // //       })
//   // //       // alreadyCheckedRatingsIndexes++
//   // //     }
//   // //     //  cnt++
//   // //   }
//   // // }
//   // for (let s = 0, l = userIds.length; s < l; s++) {
//   //   // ratingUserIds.forEach((e) => {
//   //   //   cnt++
//   //   // })
//   //   ratingUserIds.every((e) => {
//   //     // cnt++
//   //     return e > 0
//   //   })
//   //   // for (let r of rvals) {
//   //   //   // console.log(r)
//   //   //   cnt++
//   //   // }
//   //   // for (const i of rvals) {
//   //   //   cnt++
//   //   // }
//   // }

//   for (let s = 0, l = userIds.length; s < l; s++) {
//     for (let i = 0, r = ratingUserIds.length; i < r; i++) {
//       // cnt++
//       // console.log(uIdView.getUint32(s, true))
//       if (userIds[s] === ratingUserIds[i]) {
//         weightedScores.push({
//           movieId: movieIds[i],
//           weightedRating: simScores[s] * ratingScores[i],
//           simScore: simScores[s],
//         })
//         // alreadyCheckedRatingsIndexes++
//       }
//     }
//   }
//   // console.log(cnt)
//   // // console.log(ratingUserIds.length)
//   // console.log('part took', performance.now() - t1)
//   // uidBuf = null
//   // userIds = null
//   return weightedScores
// }

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

// let r = []
// let avg = []
// let iavg = []

// function calcEuclideanScoreA(userAScores, userBScores) {
//   let sim = 0
//   let n = 0

//   for (let i = 0, a = userBScores.length; i < a; i++) {
//     // for (let j = 0, b = userBScores.length; j < b; j++) {
//     sim += (userAScores[i] - userBScores[i]) ** 2
//     n += 1
//     // }
//   }

//   if (n === 0) {
//     return 0
//   }

//   let inv = 1 / (1 + sim)

//   return inv
// }
