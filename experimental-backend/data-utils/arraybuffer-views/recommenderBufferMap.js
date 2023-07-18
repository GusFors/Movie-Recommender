'use strict'

const cluster = require('node:cluster')
cluster.setupPrimary({ exec: './data-utils/arraybuffer-views/clusterW.js', serialization: 'advanced' })
let fork = cluster.fork()
const { Worker, threadId } = require('worker_threads')
let worker = new Worker('./data-utils/arraybuffer-views/scoreWorker.js')
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

  simScores.userIds = new Uint32Array(simScores.userIds)
  simScores.scores = new Float32Array(simScores.scores)
  // simScores.userIds = new Uint32Array(simScores.userIds).buffer
  // simScores.scores = new Float32Array(simScores.scores).buffer

  return simScores
}
//let weightedScores = {}
recommender.getWeightedScoresMoviesNotSeenByUser = async (userId, ratingsDataObjA, similarityScores) => {
  return new Promise(async (resolve, reject) => {
    //let ratingsDataObj = ratingsDataObjR
    let ratingsDataObj = { u: new Uint32Array(ratingsDataObjA.u), m: new Uint32Array(ratingsDataObjA.m), s: new Float32Array(ratingsDataObjA.s) }
    console.log(ratingsDataObj)
    let ratingsLength = ratingsDataObj.u.length

    let moviesSeenByUser = new Set()

    let r1 = performance.now()

    for (let i = 0, l = ratingsLength; i < l; i++) {
      if (ratingsDataObj.u[i] === userId) {
        moviesSeenByUser.add(ratingsDataObj.m[i])
      }
    }
    console.log('found user ratings in', performance.now() - r1)

    // let userIds = []
    // let movIds = []
    // let scores = []
    // // console.log(ratingsDataObj)
    // // let totalUnseenCnt = 0
    // // let indexes = []
    // let t1 = performance.now()

    // for (let y = 0, l = ratingsLength; y < l; y++) {
    //   if (!moviesSeenByUser.has(ratingsDataObj.m[y])) {
    //     // ++totalUnseenCnt
    //     // indexes.push(y)
    //     userIds.push(ratingsDataObj.u[y])
    //     movIds.push(ratingsDataObj.m[y])
    //     scores.push(ratingsDataObj.s[y])
    //   }
    // }

    // let userIds = []
    // let movIds = []
    // let scores = []
    // console.log(ratingsDataObj)
    let totalUnseenCnt = 0
    let indexes = []
    let t1 = performance.now()

    for (let y = 0, l = ratingsLength; y < l; y++) {
      if (!moviesSeenByUser.has(ratingsDataObj.m[y])) {
        ++totalUnseenCnt
        indexes.push(y)
      }
    }

    let userIds = new Uint32Array(totalUnseenCnt)
    let movIds = new Uint32Array(totalUnseenCnt)
    let scores = new Float32Array(totalUnseenCnt)

    for (let y = 0, l = indexes.length; y < l; y++) {
      userIds[y] = ratingsDataObj.u[indexes[y]]
      movIds[y] = ratingsDataObj.m[indexes[y]]
      scores[y] = ratingsDataObj.s[indexes[y]]
    }
    // console.log(userIds)
    // for (let y = 0, l = ratingsLength; y < l; y++) {
    //   if (!moviesSeenByUser.has(ratingsDataObj.m[y])) {
    //     ++totalUnseenCnt
    //     userIds.push(ratingsDataObj.u[y])
    //     movIds.push(ratingsDataObj.m[y])
    //     scores.push(ratingsDataObj.s[y])
    //   }
    // }

    // let simUids = similarityScores.userIds
    // let simScores = similarityScores.scores
    console.log(similarityScores.userIds)
    // let copy = structuredClone(similarityScores.userIds, {transfer: [similarityScores.userIds.buffer]})

    // let simUids = structuredClone(similarityScores.userIds, { transfer: [similarityScores.userIds.buffer] })
    // let simScores = structuredClone(similarityScores.scores, { transfer: [similarityScores.scores.buffer] })

    // let clone = structuredClone(similarityScores, { transfer: [similarityScores.userIds.buffer, similarityScores.scores.buffer] })
    // let simUids = clone.userIds
    // let simScores = clone.scores

    // let simUids = structuredClone(similarityScores.userIds, { transfer: [similarityScores.userIds.buffer] })
    // let simScores = structuredClone(similarityScores.scores, { transfer: [similarityScores.scores.buffer] })

    // console.log(simUids.buffer === similarityScores.userIds.buffer)

    // let simUids = new Uint32Array(similarityScores.userIds)
    // let simScores = new Float32Array(similarityScores.scores)

    let simUids = new Uint32Array(similarityScores.userIds)
    let simScores = new Float32Array(similarityScores.scores)

    // spawn worker?

    console.log('reached', performance.now() - t1)

    let weightedScores = {}

    for (let i = 0; i < movIds.length; i++) {
      if (!weightedScores[movIds[i]]) {
        weightedScores[movIds[i]] = []
      }
    }

    // let movIdKeys = [...new Set(movIds)]
    // let weightedScores = {}
    // for (let i = 0; i < movIdKeys.length; i++) {
    //   weightedScores[movIdKeys[i]] = []
    // }

    // let weightedScores = {}

    // for (let i = 0; i < movIds.length; i++) {
    //   if (!weightedScores[movIds[i]]) {

    //     weightedScores[movIds[i]] = new Float32Array(new SharedArrayBuffer())
    //   }
    // }

    //   worker.postMessage(
    //     {
    //       work: 'scores',
    //       userIds: userIds,
    //       movIds: movIds,
    //       scores: scores,

    //       simUids: simUids,
    //       simScores: simScores,
    //     },
    //     [userIds.buffer, movIds.buffer, scores.buffer, simUids.buffer, simScores.buffer]
    //   )

    //   resolve(
    //     new Promise(async (res, rej) => {
    //       worker.on('message', (msg) => {
    //         if (msg.work === 'scores') {
    //           // worker.terminate()
    //           res(msg.weightedScores)
    //         }
    //       })
    //     })
    //   )

    //   // console.log(wScores)
    // })

    // cluster.on('online', (worker) => {
    //   console.log('score fork online')
    // })

    // let fork = cluster.fork()
    //   fork.send({
    //     work: 'scores',
    //     userIds: userIds,
    //     movIds: movIds,
    //     scores: scores,
    //     weightedScores: weightedScores,
    //     simUids: simUids,
    //     simScores: simScores,
    //   })

    //   let result = await new Promise(async (res, rej) => {
    //     fork.on('message', (msg) => {
    //       if (msg.work === 'scores') {
    //         // fork.kill()
    //         // fork.disconnect()
    //         // fork.kill()
    //         res(msg.weightedScores)
    //       }
    //     })
    //   })

    //   let wScores = await result
    //   // console.log(wScores)
    //   resolve(wScores)
    // })

    let start = 0
    for (let s = 0, l = simUids.length; s < l; s++) {
      let isUserSection = false
      let end = 0
      for (let i = start, r = userIds.length; i < r; i++) {
        if (simUids[s] === userIds[i]) {
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

      for (let i = start, r = end > 0 ? end : userIds.length; i < r; i++) {
        weightedScores[movIds[i]].push({
          weightedRating: simScores[s] * scores[i],
          simScore: simScores[s],
        })
      }
    }
    resolve(new Promise((res, err) => res(weightedScores)))
    //return weightedScores
  })
}

recommender.getMovieRecommendationScores = async (weightedScores, moviesData, threads, timer) => {
  return new Promise((resolve, reject) => {
    let movieRecommendations = []
    // let weightedScores =  structuredClone(weightedScoresA) //{...weightedScoresA}//JSON.parse(JSON.stringify(weightedScoresA))
    let m1 = performance.now()

    console.log('sort weightedScorest in:', performance.now() - m1)

    let r1 = performance.now()
    let moviesChunks = arrayChunkPush(moviesData, threads)
    console.log('chunk movies in:', performance.now() - r1)

    let w1 = performance.now()
    let movieChunkIds = []
    let wScoresChunks = []
    let wBuffers = []
    for (let y = 0; y < moviesChunks.length; y++) {
      if (!movieChunkIds[y]) {
        movieChunkIds[y] = new Set()
      }
      for (let j = 0; j < moviesChunks[y].length; j++) {
        movieChunkIds[y].add(moviesChunks[y][j].movieId)
      }

      wScoresChunks[y] = []
      wBuffers[y] = []

      let movIdsKeys = Object.keys(weightedScores)

      for (let w = 0; w < movIdsKeys.length; w++) {
        if (movieChunkIds[y].has(+movIdsKeys[w])) {
          let currMovIdArr = weightedScores[movIdsKeys[w]]
          let end = currMovIdArr.length
          let rBuffer = new ArrayBuffer(end * 12)
          let v = new DataView(rBuffer)

          for (let m = 0; m < weightedScores[movIdsKeys[w]].length; m++) {
            if (w === 0) {
            }

            v.setInt32(m * 12, movIdsKeys[w], true)
            v.setFloat32(m * 12 + 4, currMovIdArr[m].weightedRating, true)
            v.setFloat32(m * 12 + 8, currMovIdArr[m].simScore, true)
          }
          wScoresChunks[y].push(rBuffer)
        }
      }
    }

    console.log('chunk ws:', performance.now() - w1)
    console.log('timer arg', performance.now() - timer)

    let t1 = performance.now()
    let calcData = []

    for (let i = 0; i < wScoresChunks[0].length; i++) {
      let weightedScoreSum = 0
      let simScoreSum = 0
      let floatView = new Float32Array(wScoresChunks[0][i])
      let int32View = new Int32Array(wScoresChunks[0][i])
      let id
      for (let j = 0; j < floatView.length; j += 3) {
        if (j === 0) {
          id = int32View[j]
        }
        weightedScoreSum = weightedScoreSum + floatView[j + 1]
        simScoreSum = simScoreSum + floatView[j + 2]
      }

      if (weightedScoreSum > 0) {
        calcData.push({
          movieId: new Int32Array(wScoresChunks[0][i])[0],
          recommendationScore: typeof (weightedScoreSum / simScoreSum) === 'number' ? weightedScoreSum / simScoreSum : 0,
        })
      }
    }

    let f1 = performance.now()
    let wsMovIds = new Set(
      wScoresChunks[0].map((ws) => {
        return new Int32Array(ws)[0]
      })
    )

    moviesData = moviesData.filter((m) => wsMovIds.has(m.movieId))

    console.log('map/filter in', performance.now() - f1)

    for (let y = 0; y < calcData.length; y++) {
      if (calcData[y].recommendationScore > 0) {
        movieRecommendations.push({
          movieId: calcData[y].movieId,
          title: moviesData[y].title,
          numRatings: moviesData[y].numRatings,

          recommendationScore: calcData[y].recommendationScore,
        })
      }
    }

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
