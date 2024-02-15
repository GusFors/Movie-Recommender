'use strict'

const { arrayChunkPush, arrayChunkPop, arrayChunkShift } = require('../arrayChunk.js')

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

  let relevantScoresUserIds = []
  let relevantScoresMovIds = []
  let relevantScoresRatings = []

  let p1 = performance.now()
  for (let r = 0, l = ratingsLength; r < l; r++) {
    if (ratingsDataObj.u[r] === userId) {
      userAMovIdsM.set(ratingsDataObj.m[r], ratingsDataObj.s[r])
    } else {
      relevantScoresUserIds.push(ratingsDataObj.u[r])
      relevantScoresMovIds.push(ratingsDataObj.m[r])
      relevantScoresRatings.push(ratingsDataObj.s[r])
    }
  }
  console.log('push took', performance.now() - p1)

  let i1 = performance.now()
  let matchesIndexes = []
  let othersRatingUserIds = []
  let otherScores = []
  let otherMovIds = []

  for (let r = 0, l = relevantScoresMovIds.length; r < l; r++) {
    if (userAMovIdsM.has(relevantScoresMovIds[r])) {
      othersRatingUserIds.push(relevantScoresUserIds[r])
      otherScores.push(relevantScoresRatings[r])
      otherMovIds.push(relevantScoresMovIds[r])
    }
  }

  let t2 = performance.now()
  let uniqueOtherIds = [...new Set(othersRatingUserIds)]
  let alreadyCheckedRatingsIndexes = 0

  for (let i = 0, u = uniqueOtherIds.length; i < u; i++) {
    let userBScores = []
    let userAScoresFromMatchingIndexes = []

    for (let r = alreadyCheckedRatingsIndexes, l = othersRatingUserIds.length; r < l; r++) {
      if (othersRatingUserIds[r] === uniqueOtherIds[i]) {
        userBScores.push(otherScores[r])
        userAScoresFromMatchingIndexes.push(userAMovIdsM.get(otherMovIds[r]))

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
  console.log('second section took', performance.now() - t2)

  simScores.userIds = new Int32Array(simScores.userIds)
  simScores.scores = new Float32Array(simScores.scores)

  return simScores
}

recommender.getWeightedScoresMoviesNotSeenByUser = async (userId, ratingsDataObj, similarityScores) => {
  return new Promise(async (resolve, reject) => {
    // let ratingsDataObj = { u: new Int32Array(ratingsDataObjA.u), m: new Int32Array(ratingsDataObjA.m), s: new Float32Array(ratingsDataObjA.s) }
    // let ratingsDataObj = { u: new Int32Array(ratingsDataObjA.u.buffer), m: new Int32Array(ratingsDataObjA.m.buffer), s: new Float32Array(ratingsDataObjA.s.buffer) }
    // let ratingsDataObj = { u: new Int32Array(ratingsDataObjA.u.buffer), m: new Int32Array(ratingsDataObjA.m.buffer), s: new Float32Array(ratingsDataObjA.s.buffer) }
    let ratingsLength = ratingsDataObj.u.length

    // let moviesSeenByUser = new Set()

    // let r1 = performance.now()

    // for (let i = 0, l = ratingsLength; i < l; i++) {
    //   if (ratingsDataObj.u[i] === userId) {
    //     moviesSeenByUser.add(ratingsDataObj.m[i])
    //   }
    // }
    // console.log('found user ratings in', performance.now() - r1)

    // let totalUnseenCnt = 0
    // let indexes = []
    let t1 = performance.now()

    // for (let y = 0, l = ratingsLength; y < l; y++) {
    //   ++totalUnseenCnt
    //   indexes.push(y)
    // }
    // console.log(indexes)
    // let userIds = new Int32Array(totalUnseenCnt)
    // let movIds = new Int32Array(totalUnseenCnt)
    // let scores = new Float32Array(totalUnseenCnt)

    // let userIds = new Array(ratingsLength)// .set(ratingsDataObj.u)
    // let movIds = new Array(ratingsLength)
    // let scores = new Array(ratingsLength)

    // let userIds = new Int32Array(ratingsLength)// .set(ratingsDataObj.u)
    // let movIds = new Int32Array(ratingsLength)
    // let scores = new Float32Array(ratingsLength)

    // for (let y = 0, l = ratingsLength; y < l; y++) {
    //   userIds[y] = ratingsDataObj.u[y]
    //   movIds[y] = ratingsDataObj.m[y]
    //   scores[y] = ratingsDataObj.s[y]
    // }

    // for (let y = 0, l = indexes.length; y < l; y++) {
    //   userIds[y] = ratingsDataObj.u[indexes[y]]
    //   movIds[y] = ratingsDataObj.m[indexes[y]]
    //   scores[y] = ratingsDataObj.s[indexes[y]]
    // }

    // console.log(indexes.length)
    // for (let y = 0; y < indexes.length; y += 2) {
    //   userIds[y] = ratingsDataObj.u[indexes[y]]
    //   userIds[y + 1] = ratingsDataObj.u[indexes[y + 1]]
    //   movIds[y] = ratingsDataObj.m[indexes[y]]
    //   movIds[y + 1] = ratingsDataObj.m[indexes[y + 1]]
    //   scores[y] = ratingsDataObj.s[indexes[y]]
    //   scores[y + 1] = ratingsDataObj.s[indexes[y + 1]]
    // }

    // let simUids = new Int32Array(similarityScores.userIds)
    // let simScores = new Float32Array(similarityScores.scores)

    // let simUids = new Int32Array(similarityScores.userIds.buffer.transfer())
    // let simScores = new Float32Array(similarityScores.scores.buffer.transfer())

    let simUids = Array.from(new Int32Array(similarityScores.userIds.buffer.transfer()))
    let simScores = Array.from(new Float32Array(similarityScores.scores.buffer.transfer()))

    console.log('reached', performance.now() - t1)

    let weightedScores = {}

    for (let i = 0; i < ratingsDataObj.m.length; i++) {
      if (!weightedScores[ratingsDataObj.m[i]]) {
        weightedScores[ratingsDataObj.m[i]] = []
      }
    }

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

    // for (let i = 0; i < movIds.length; i++) {
    //   if (!weightedScores[movIds[i]]) {
    //     weightedScores[movIds[i]] = []
    //   }
    // }

    // let start = 0
    // for (let s = 0, l = simUids.length; s < l; s++) {
    //   let isUserSection = false
    //   let end = 0
    //   for (let i = start, r = userIds.length; i < r; i++) {
    //     if (simUids[s] === userIds[i]) {
    //       if (!isUserSection) {
    //         isUserSection = true
    //         start = i
    //       }
    //     } else {
    //       if (isUserSection) {
    //         end = i
    //         break
    //       }
    //     }
    //   }

    //   for (let i = start, r = end > 0 ? end : userIds.length; i < r; i++) {
    //     weightedScores[movIds[i]].push({
    //       weightedRating: simScores[s] * scores[i],
    //       simScore: simScores[s],
    //     })
    //   }
    // }
    resolve(new Promise((res, err) => res(weightedScores)))
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
        // for (let w = 0; w < movIdsKeys.length; w++) {
        if (movieChunkIds[y].has(+movIdsKeys[w])) {
          let currMovIdArr = weightedScores[movIdsKeys[w]]
          let end = currMovIdArr.length

          // let rBuffer = new ArrayBuffer(end * 12)
          let rBuffer = new ArrayBuffer(end * 8)
          let dv = new DataView(rBuffer)

          for (let m = 0, l = weightedScores[movIdsKeys[w]].length; m < l; m++) {
            // for (let m = 0; m < weightedScores[movIdsKeys[w]].length; m++) {

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
          // movieId: new Int32Array(wScoresChunks[y][i])[0],
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

recommender.getMoviesSeenByUser = (userId, ratingsDataObj) => {
  let moviesSeenByUser = new Set()

  for (let i = 0, l = ratingsDataObj.u.length; i < l; i++) {
    if (ratingsDataObj.u[i] === userId) {
      moviesSeenByUser.add(ratingsDataObj.m[i])
    }
  }

  return moviesSeenByUser
}

recommender.getIgnoredMovieIds = (userId, ratingsDataObjR) => {
  let ratingsDataObj = ratingsDataObjR
  let ratingsLength = ratingsDataObj.u.length

  let userAMovIdsM = new Map()

  let relevantScoresUserIds = []
  let relevantScoresMovIds = []
  let relevantScoresRatings = []

  for (let r = 0, l = ratingsLength; r < l; r++) {
    if (ratingsDataObj.u[r] === userId) {
      userAMovIdsM.set(ratingsDataObj.m[r], ratingsDataObj.s[r])
    } else {
      relevantScoresUserIds.push(ratingsDataObj.u[r])
      relevantScoresMovIds.push(ratingsDataObj.m[r])
      relevantScoresRatings.push(ratingsDataObj.s[r])
    }
  }

  let othersRatingUserIds = []

  let otherMovIds = []
  let ignoredMovIds = []
  let ignoredUserIds = []

  for (let r = 0, l = relevantScoresMovIds.length; r < l; r++) {
    if (userAMovIdsM.has(relevantScoresMovIds[r])) {
      othersRatingUserIds.push(relevantScoresUserIds[r])
      otherMovIds.push(relevantScoresMovIds[r])
    } else {
      ignoredMovIds.push(relevantScoresMovIds[r])
      ignoredUserIds.push(relevantScoresUserIds[r])
    }
  }

  let othersRatingUserIdsSet = new Set(othersRatingUserIds)

  let movIdsToIgnore = []

  for (let r = 0, l = relevantScoresMovIds.length; r < l; r++) {
    if (!othersRatingUserIdsSet.has(relevantScoresUserIds[r])) {
      movIdsToIgnore.push(relevantScoresMovIds[r])
    }
  }

  return new Set(movIdsToIgnore)
}

recommender.getMovieIdsAboveMinNumRatings = (minNumRatings, moviesData) => {
  let movieIdsAboveMin = []
  for (let i = 0; i < moviesData.length; i++) {
    if (moviesData[i].numRatings >= minNumRatings) {
      movieIdsAboveMin.push(moviesData[i].movieId)
    }
  }
  return movieIdsAboveMin
}

module.exports = recommender
