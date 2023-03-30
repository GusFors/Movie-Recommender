'use strict'

const { fork } = require('child_process')

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
  let ratingsDataObj = ratingsDataObjR //ratingsDataObjR.deref()
  // let ratingsData = ratingsDataObj.r
  let ratingsLength = ratingsDataObj.u.length
  let simScores = { userIds: [], scores: [] }
  // let t1 = performance.now()
  let userAMovIds = new Set() // function since looping through movies seen by userId several times?
  let userAMovIdsM = new Map()
  let userAScores = []
  let aMatchScores = [] // keep track of userId movieIds to match scores with other users

  // let relevantScores = []
  let relevantScoresUserIds = []
  let relevantScoresMovIds = []
  let relevantScoresRatings = []

  let p1 = performance.now()
  for (let r = 0, l = ratingsLength; r < l; r++) {
    if (ratingsDataObj.u[r] === userId) {
      // aMatchScores.push(ratingsDataObj.m[r]) // ['m']
      // userAMovIds.add(ratingsDataObj.m[r])
      // userAScores.push(ratingsDataObj.s[r])
      userAMovIdsM.set(ratingsDataObj.m[r], ratingsDataObj.s[r])
    } else {
      // relevantScores.push(ratingsData[r])
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
    // if (userAMovIds.has(relevantScoresMovIds[r]))
    if (userAMovIdsM.has(relevantScoresMovIds[r])) {
      // matchesIndexes.push(aMatchScores.indexOf(relevantScoresMovIds[r])) // store value instead? ~3.2ms
      othersRatingUserIds.push(relevantScoresUserIds[r])
      otherScores.push(relevantScoresRatings[r])
      otherMovIds.push(relevantScoresMovIds[r])
    }
  }
  // console.log('indexof match took', performance.now() - i1)

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
        // userAScoresFromMatchingIndexes.push(userAScores[matchesIndexes[r]])
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

  return simScores
}

recommender.getWeightedScoresMoviesNotSeenByUser = (userId, ratingsDataObjR, similarityScores) => {
  let ratingsDataObj = ratingsDataObjR // ratingsDataObjR.deref()
  let ratingsLength = ratingsDataObj.u.length

  let moviesSeenByUser = new Set()

  let r1 = performance.now()
  // let isUser = false
  for (let i = 0, l = ratingsLength; i < l; i++) {
    if (ratingsDataObj.u[i] === userId) {
      moviesSeenByUser.add(ratingsDataObj.m[i])
    }
  }
  console.log('found user ratings in', performance.now() - r1)

  let userIds = []
  let movIds = []
  let scores = []

  let t1 = performance.now()
  for (let y = 0, l = ratingsLength; y < l; y++) {
    // let c = ratingsDataObj.m[y]
    if (!moviesSeenByUser.has(ratingsDataObj.m[y])) {
      //  if(!movIdFilter.has(ratingsDataObj.m[y])) {
      userIds.push(ratingsDataObj.u[y])
      movIds.push(ratingsDataObj.m[y])
      scores.push(ratingsDataObj.s[y])
      //}
    }
  }

  // console.log('w section took', performance.now() - t1)
  let weightedScores = []
  let simUids = new Uint32Array(similarityScores.userIds)
  let simScores = new Float32Array(similarityScores.scores)

  // since they are sorted by userId don't loop through every element each time, instead find the range for each user and only push the scores in that range
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
    // extra check to include last user
    for (let i = start, r = end > 0 ? end : userIds.length; i < r; i++) {
      // slice and push range instead of loop push?
      weightedScores.push({
        movieId: movIds[i],
        weightedRating: simScores[s] * scores[i],
        simScore: simScores[s],
      })
    }
  }

  return weightedScores
}





recommender.getMovieRecommendationScores = async (weightedScoresA, moviesData, threads, timer) => {
  return new Promise((resolve, reject) => {
    let movieRecommendations = []

    let m1 = performance.now()
    let weightedScores = weightedScoresA.sort((a, b) => {
      // sort typed arrays with ids faster?
      return a.movieId - b.movieId
    })

    console.log('sort weightedScorest in:', performance.now() - m1)

    // for (let r = 0; r < moviesData.length; r++) {
    //   let holder = moviesData[r]
    //   let newIndex = Math.floor(Math.random() * (moviesData.length - 1)) // -1?
    //   moviesData[r] = moviesData[newIndex]
    //   moviesData[newIndex] = holder
    // }

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
      for (let w = 0; w < weightedScores.length; w++) {
        if (movieChunkIds[y].has(weightedScores[w].movieId)) {
          let start = w
          let end = 0
          let currId = weightedScores[w].movieId

          for (let i = start; i < weightedScores.length; i++) {
            if (weightedScores[i].movieId !== currId) {
              break
            }
            end++
          }

          let rBuffer = new ArrayBuffer(end * 12)
          let v = new DataView(rBuffer) // create buffer in constr? skip let

          // for (let i = start; i < start + end; i += 12)
          for (let i = 0; i < end; i++) {
            v.setInt32(i * 12, weightedScores[i + start].movieId, true) // only set four first bits to movid? dont repeat
            v.setFloat32(i * 12 + 4, weightedScores[i + start].weightedRating, true)
            v.setFloat32(i * 12 + 8, weightedScores[i + start].simScore, true)
            w++
          }
          wScoresChunks[y].push(rBuffer)
          w--
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

      calcData.push({
        movieId: new Int32Array(wScoresChunks[0][i])[0],
        // title: i, // movieTitles[i]
        // numRatings: i, // movieNumRatings[i]
        recommendationScore: typeof (weightedScoreSum / simScoreSum) === 'number' ? weightedScoreSum / simScoreSum : 0,
      })
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
          title: moviesData[y].title, // movieTitles[i]
          numRatings: moviesData[y].numRatings, // movieNumRatings[i]
          // title: 'moviesData[y].title', // movieTitles[i]
          // numRatings: 'moviesData[y].numRatings,', // movieNumRatings[i]
          recommendationScore: calcData[y].recommendationScore,
        })
      }
    }

    let t2 = performance.now()
    console.log('put together recommendations in', t2 - t1, 'from spawn:', t2 - t1)

    resolve(movieRecommendations)
  })
}

function arrayChunkPush(arr, chunkCnt) {
  let chunkSize = arr.length % chunkCnt === 0 ? arr.length / chunkCnt : Math.floor(arr.length / chunkCnt)

  let temp = []

  for (let c = 0; c < chunkCnt; c++) {
    temp.push([])
  }

  for (let c = 0; c < chunkCnt; c++) {
    for (let i = c * chunkSize; i < chunkSize * (c + 1); i++) {
      temp[c].push(arr[i])
    }
  }

  // if (arr.length % chunkCnt !== 0) {
  //   for (let r = arr.length - 1; r >= arr.length - (arr.length % chunkCnt); r--) {
  //     temp[0].push(arr[r])
  //   }
  // }

  if (arr.length % chunkCnt !== 0) {
    for (let r = arr.length - (arr.length % chunkCnt); r <= arr.length - 1; r++) {
      temp[temp.length - 1].push(arr[r])
    }
  }

  return temp
}

function arrayChunkShift(arr, chunkCnt) {
  let mod = arr.length % chunkCnt
  let chunkSize = mod === 0 ? arr.length / chunkCnt : Math.floor(arr.length / chunkCnt)

  let temp = []

  for (let c = 0; c < chunkCnt; c++) {
    temp.push([])
  }

  for (let c = 0; c < chunkCnt; c++) {
    for (let i = 0; i < chunkSize; i++) {
      temp[c].push(arr.shift())
    }
  }

  let rem = arr.length
  if (mod !== 0) {
    for (let r = 0; r < rem; r++) {
      temp[0].push(arr.shift())
    }
  }

  return temp
}

function arrayChunkPop(arr, chunkCnt) {
  let mod = arr.length % chunkCnt
  let chunkSize = mod === 0 ? arr.length / chunkCnt : Math.floor(arr.length / chunkCnt)

  let temp = []

  for (let c = 0; c < chunkCnt; c++) {
    temp.push([])
  }

  for (let c = 0; c < chunkCnt; c++) {
    for (let i = 0; i < chunkSize; i++) {
      temp[c].push(arr.pop())
    }
  }

  let rem = arr.length
  if (mod !== 0) {
    for (let r = 0; r < rem; r++) {
      temp[0].push(arr.pop())
    }
  }

  return temp
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
  // let otherScores = []
  let otherMovIds = []
  let ignoredMovIds = []
  let ignoredUserIds = []

  for (let r = 0, l = relevantScoresMovIds.length; r < l; r++) {
    if (userAMovIdsM.has(relevantScoresMovIds[r])) {
      othersRatingUserIds.push(relevantScoresUserIds[r])
      otherMovIds.push(relevantScoresMovIds[r])
      // otherScores.push(relevantScoresRatings[r])
    } else {
      ignoredMovIds.push(relevantScoresMovIds[r]) // not seen by userId
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

recommender.getEuclidianSimScoresForUser = (userId, ratingsData) => {
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
    }
  }

  return simScores
}

// recommender.getMoviesNotSeenByUser = (userId, ratingsDataObj) => {}

module.exports = recommender
