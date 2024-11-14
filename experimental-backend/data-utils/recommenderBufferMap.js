'use strict'

const { arrayChunkPush, arrayChunkPop, arrayChunkShift } = require('./arrayChunk.js')

const recommender = {}

recommender.calcEuclideanScoreA = (userAScores, userBScores) => {
  let sim = 0
  let n = 0

  for (let i = 0, l = userBScores.length; i < l; i++) {
    sim += (userAScores[i] - userBScores[i]) ** 2
    n += 1
  }

  if (n === 0) {
    return 0
  }

  let inv = 1 / (1 + sim)
  return inv
}

recommender.getEuclidianSimScoresForUserR = (userId, ratingsDataObjR) => {
  let ratingsDataObj = ratingsDataObjR

  let ratingsLength = ratingsDataObj.u.length
  let simScores = { userIds: [], scores: [] }

  let userAMovIdsM = new Map()

  let p1 = performance.now()
  let lengthCnt = 0
  for (let r = 0, l = ratingsLength; r < l; r++) {
    if (ratingsDataObj.u[r] === userId) {
      userAMovIdsM.set(ratingsDataObj.m[r], ratingsDataObj.s[r])
    } else {
      lengthCnt++
    }
  }

  let relevantScoresUserIds = new Int32Array(lengthCnt)
  let relevantScoresMovIds = new Int32Array(lengthCnt)
  let relevantScoresRatings = new Float32Array(lengthCnt)

  for (let r = 0, l = ratingsLength; r < l; r++) {
    if (ratingsDataObj.u[r] !== userId) {
      relevantScoresUserIds[r] = ratingsDataObj.u[r]
      relevantScoresMovIds[r] = ratingsDataObj.m[r]
      relevantScoresRatings[r] = ratingsDataObj.s[r]
    }
  }

  console.log('push took', performance.now() - p1)

  let count = 0
  let matchingIndex = []
  for (let r = 0, l = relevantScoresMovIds.length; r < l; r++) {
    if (userAMovIdsM.has(relevantScoresMovIds[r])) {
      matchingIndex.push(r)
      count++
    }
  }

  let othersRatingUserIds = new Int32Array(count)
  let otherMovIds = new Int32Array(count)
  let otherScores = new Float32Array(count)

  for (let r = 0, match = matchingIndex[r], l = count; r < l; ) {
    othersRatingUserIds[r] = relevantScoresUserIds[match]
    otherMovIds[r] = relevantScoresMovIds[match]
    otherScores[r] = relevantScoresRatings[match]
    match = matchingIndex[r++]
  }
  // for (let r = 0, l = count, match = matchingIndex[r]; r < l;  match = matchingIndex[++r]) {
  // for (let r = 0, l = count; r < l; r++) {

  let t2 = performance.now()
  let uniqueOtherIds = [...new Set(othersRatingUserIds)]
  let alreadyCheckedRatingsIndexes = 0

  for (let i = 0, u = uniqueOtherIds.length; i < u; i++) {
    let userBScores = []
    let userAScoresFromMatchingIndexes = []

    for (let r = alreadyCheckedRatingsIndexes, l = othersRatingUserIds.length; r < l; r++) {
      if (othersRatingUserIds[r] !== uniqueOtherIds[i]) {
        break
      } // else
      userBScores.push(otherScores[r])
      userAScoresFromMatchingIndexes.push(userAMovIdsM.get(otherMovIds[r]))
      alreadyCheckedRatingsIndexes++
    }

    let simScore = recommender.calcEuclideanScoreA(userAScoresFromMatchingIndexes, userBScores)
    if (simScore > 0) {
      simScores.userIds.push(uniqueOtherIds[i])
      simScores.scores.push(simScore)
    }
  }
  console.log('second section took', performance.now() - t2)

  simScores.userIds = new Int32Array(simScores.userIds)
  simScores.scores = new Float32Array(simScores.scores)

  return simScores
}

recommender.getWeightedScoresMoviesNotSeenByUserArr = async (userId, ratingsDataObj, similarityScores) => {
  return new Promise(async (resolve, reject) => {
    let t1 = performance.now()

    let simUids = new Int32Array(similarityScores.userIds.buffer.transfer())
    let simScores = new Float32Array(similarityScores.scores.buffer.transfer())

    // let simUids = Array.from(new Int32Array(similarityScores.userIds.buffer.transfer()))
    // let simScores = Array.from(new Float32Array(similarityScores.scores.buffer.transfer()))

    let weightedScores = {}

    for (let i = 0; i < ratingsDataObj.m.length; i++) {
      if (!weightedScores[ratingsDataObj.m[i]]) {
        weightedScores[ratingsDataObj.m[i]] = []
      }
    }
    // console.log(ratingsDataObj)
    console.log('reached', performance.now() - t1)

    let start = 0
    for (let s = 0, l = simUids.length; s < l; s++) {
      let isUserSection = false
      let end = 0
      for (let i = start, r = ratingsDataObj.u.length; i < r; i++) {
        if (simUids[s] === ratingsDataObj.u[i]) {
          if (!isUserSection) {
            isUserSection = true
            start = i
          }
        } else {
          if (isUserSection) {
            end = i
            break
          }
        }
      }

      for (let i = start, r = end > 0 ? end : ratingsDataObj.u.length; i < r; i++) {
        weightedScores[ratingsDataObj.m[i]].push(simScores[s] * ratingsDataObj.s[i])
        weightedScores[ratingsDataObj.m[i]].push(simScores[s])
      }
    }

    resolve(weightedScores)
  })
}

recommender.getMovieRecommendationScoresArr = async (weightedScores, moviesData, threads, timer) => {
  return new Promise((resolve, reject) => {
    let movieRecommendations = []

    let r1 = performance.now()
    let moviesChunks = arrayChunkPush(moviesData, threads)

    console.log('chunk movies in:', performance.now() - r1)

    let w1 = performance.now()
    let movieChunkIds = []
    let wScoresChunks = []
    let wBuffers = []
    let arrBuffMovIds = []

    for (let y = 0; y < moviesChunks.length; y++) {
      if (!movieChunkIds[y]) {
        movieChunkIds[y] = new Set()
      }

      for (let j = 0; j < moviesChunks[y].length; j++) {
        movieChunkIds[y].add(moviesChunks[y][j].movieId)
      }

      wScoresChunks[y] = []
      wBuffers[y] = []
      arrBuffMovIds[y] = []

      let movIdsKeys = Int32Array.from(movieChunkIds[y])

      for (let w = 0, v = movIdsKeys.length; w < v; w++) {
        if (movieChunkIds[y].has(+movIdsKeys[w])) {
          let currMovIdArr = weightedScores[movIdsKeys[w]]
          let end = currMovIdArr.length

          let rBuffer = new ArrayBuffer(end * 8)
          let dv = new DataView(rBuffer)

          for (let m = 0, l = weightedScores[movIdsKeys[w]].length; m < l; m += 2) {
            dv.setFloat32(m * 8, currMovIdArr[m], true)
            dv.setFloat32(m * 8 + 4, currMovIdArr[m + 1], true)
          }
          wScoresChunks[y].push(rBuffer)
          arrBuffMovIds[y].push(movIdsKeys[w])
        }
      }
    }

    console.log('chunk ws:', performance.now() - w1)
    console.log('timer arg', performance.now() - timer)

    let t1 = performance.now()
    let calcData = []
    let combinedMovIds = new Set()

    for (let y = 0, v = wScoresChunks.length; y < v; y++) {
      for (let i = 0, l = wScoresChunks[y].length; i < l; i++) {
        let weightedScoreSum = 0
        let simScoreSum = 0
        let floatView = new Float32Array(wScoresChunks[y][i])

        for (let j = 0; j < floatView.length; j += 2) {
          weightedScoreSum = weightedScoreSum + floatView[j]
          simScoreSum = simScoreSum + floatView[j + 1]
        }

        calcData.push({
          movieId: arrBuffMovIds[y][i],
          recommendationScore: typeof (weightedScoreSum / simScoreSum) === 'number' ? weightedScoreSum / simScoreSum : 0,
        })
      }
      console.log('viewR', performance.now() - t1)

      let f1 = performance.now()

      let wsMovIds = new Set(arrBuffMovIds[y])

      for (let m = 0; m < moviesData.length; m++) {
        if (wsMovIds.has(moviesData[m].movieId)) {
          combinedMovIds.add(moviesData[m].movieId)
        }
      }
      console.log('map/filter in', performance.now() - f1)
    }

    let mrec = performance.now()
    for (let w = 0; w < calcData.length; w++) {
      if (calcData[w].recommendationScore > 0) {
        movieRecommendations.push({
          movieId: calcData[w].movieId,
          title: moviesData[w].title,
          numRatings: moviesData[w].numRatings,
          recommendationScore: calcData[w].recommendationScore,
        })
      }
    }

    console.log('movieRec', performance.now() - mrec)

    let t2 = performance.now()
    console.log('put together recommendations in', t2 - t1, 'from spawn:', t2 - t1)

    resolve(movieRecommendations)
  })
}

recommender.getWeightedScoresMoviesNotSeenByUser = async (userId, ratingsDataObj, similarityScores) => {
  return new Promise(async (resolve, reject) => {
    let t1 = performance.now()

    let simUids = new Int32Array(similarityScores.userIds.buffer.transfer())
    let simScores = new Float32Array(similarityScores.scores.buffer.transfer())

    // let simUids = Array.from(new Int32Array(similarityScores.userIds.buffer.transfer()))
    // let simScores = Array.from(new Float32Array(similarityScores.scores.buffer.transfer()))

    let weightedScores = {}

    for (let i = 0; i < ratingsDataObj.m.length; i++) {
      if (!weightedScores[ratingsDataObj.m[i]]) {
        weightedScores[ratingsDataObj.m[i]] = []
      }
    }
    console.log('reached', performance.now() - t1)

    let start = 0
    for (let s = 0, l = simUids.length; s < l; s++) {
      let isUserSection = false
      let end = 0
      for (let i = start, r = ratingsDataObj.u.length; i < r; i++) {
        if (simUids[s] === ratingsDataObj.u[i]) {
          if (!isUserSection) {
            isUserSection = true
            start = i
          }
        } else {
          if (isUserSection) {
            end = i
            break
          }
        }
      }

      for (let i = start, r = end > 0 ? end : ratingsDataObj.u.length; i < r; i++) {
        weightedScores[ratingsDataObj.m[i]].push({
          weightedRating: simScores[s] * ratingsDataObj.s[i],
          simScore: simScores[s],
        })
      }
    }

    resolve(weightedScores)
  })
}

recommender.getMovieRecommendationScores = async (weightedScores, moviesData, threads, timer) => {
  return new Promise((resolve, reject) => {
    let movieRecommendations = []

    let m1 = performance.now()

    // console.log('sort weightedScorest in:', performance.now() - m1)

    let r1 = performance.now()
    let moviesChunks = arrayChunkPush(moviesData, threads)
    console.log('chunk movies in:', performance.now() - r1)

    let w1 = performance.now()
    let movieChunkIds = []
    let wScoresChunks = []
    let wBuffers = []
    let arrBuffMovIds = []

    for (let y = 0; y < moviesChunks.length; y++) {
      if (!movieChunkIds[y]) {
        movieChunkIds[y] = new Set()
      }

      for (let j = 0; j < moviesChunks[y].length; j++) {
        movieChunkIds[y].add(moviesChunks[y][j].movieId)
      }

      wScoresChunks[y] = []
      wBuffers[y] = []
      arrBuffMovIds[y] = []

      let movIdsKeys = Int32Array.from(movieChunkIds[y])

      for (let w = 0, v = movIdsKeys.length; w < v; w++) {
        if (movieChunkIds[y].has(+movIdsKeys[w])) {
          let currMovIdArr = weightedScores[movIdsKeys[w]]
          let end = currMovIdArr.length

          let rBuffer = new ArrayBuffer(end * 8)
          let dv = new DataView(rBuffer)

          for (let m = 0, l = weightedScores[movIdsKeys[w]].length; m < l; m++) {
            dv.setFloat32(m * 8, currMovIdArr[m].weightedRating, true)
            dv.setFloat32(m * 8 + 4, currMovIdArr[m].simScore, true)

            // v.setUint32(m * 12, movIdsKeys[w], true)
            // v.setFloat32(m * 12 + 4, currMovIdArr[m].weightedRating, true)
            // v.setFloat32(m * 12 + 8, currMovIdArr[m].simScore, true)
          }
          wScoresChunks[y].push(rBuffer)
          arrBuffMovIds[y].push(movIdsKeys[w])
        }
      }
    }

    console.log('chunk ws:', performance.now() - w1)
    console.log('timer arg', performance.now() - timer)

    let t1 = performance.now()
    let calcData = []
    let combinedMovIds = new Set()
    for (let y = 0, v = wScoresChunks.length; y < v; y++) {
      for (let i = 0, l = wScoresChunks[y].length; i < l; i++) {
        let weightedScoreSum = 0
        let simScoreSum = 0
        let floatView = new Float32Array(wScoresChunks[y][i])

        for (let j = 0; j < floatView.length; j += 2) {
          weightedScoreSum = weightedScoreSum + floatView[j]
          simScoreSum = simScoreSum + floatView[j + 1]
        }

        // if (weightedScoreSum > 0) {
        calcData.push({
          movieId: arrBuffMovIds[y][i],
          recommendationScore: typeof (weightedScoreSum / simScoreSum) === 'number' ? weightedScoreSum / simScoreSum : 0,
        })
        // }
      }
      console.log('viewR', performance.now() - t1)

      let f1 = performance.now()

      let wsMovIds = new Set(arrBuffMovIds[y])

      for (let m = 0; m < moviesData.length; m++) {
        if (wsMovIds.has(moviesData[m].movieId)) {
          combinedMovIds.add(moviesData[m].movieId)
        }
      }
      console.log('map/filter in', performance.now() - f1)
    }

    let mrec = performance.now()
    for (let w = 0; w < calcData.length; w++) {
      if (calcData[w].recommendationScore > 0) {
        movieRecommendations.push({
          movieId: calcData[w].movieId,
          title: moviesData[w].title,
          numRatings: moviesData[w].numRatings,
          recommendationScore: calcData[w].recommendationScore,
        })
      }
    }

    console.log('movieRec', performance.now() - mrec)

    let t2 = performance.now()
    console.log('put together recommendations in', t2 - t1, 'from spawn:', t2 - t1)

    resolve(movieRecommendations)
  })
}

module.exports = recommender
