'use strict'

const { fork } = require('child_process')
const { Worker } = require('worker_threads')

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

// spawn forks early before doing calculations to skip some of the delay? send data later
recommender.getMovieRecommendationForkScores = async (weightedScoresA, moviesData, threads, timer) => {
  return new Promise((resolve, reject) => {
    let movieRecommendations = []

    // console.time('fork') // first onmessage takes around 65ms extra

    let weightedScores = weightedScoresA.sort((a, b) => {
      // sort typed arrays with ids faster?
      return a.movieId - b.movieId
    })

    let m1 = performance.now()
    // for (let r = 0; r < moviesData.length; r++) {
    //   let holder = moviesData[r]
    //   let newIndex = Math.floor(Math.random() * (moviesData.length - 1)) // -1?
    //   moviesData[r] = moviesData[newIndex]
    //   moviesData[newIndex] = holder
    // }
    console.log('randomize in:', performance.now() - m1)

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

          // let rBuffer = new ArrayBuffer((start + end) * 12)
          // let v = new DataView(rBuffer)

          // // for (let i = start; i < start + end; i += 12)
          // for (let i = start; i < start + end; i++) {
          //   v.setInt32(i * 12, weightedScores[i].movieId, true)
          //   v.setFloat32(i * 12 + 4, weightedScores[i].weightedRating, true)
          //   v.setFloat32(i * 12 + 8, weightedScores[i].simScore, true)
          // }

          // console.log(v)
          // wScoresChunks[y].push(v)

          // for (let i = start; i < start + end; i++) {
          //   let wrBuffer = new ArrayBuffer(12) // create long buffer for every rating for one movie?
          //   // batch and find range for one movieId and set it to one arraybuffer?
          //   let dv = Buffer.from(wrBuffer)
          //   dv.writeInt32LE(weightedScores[i].movieId, 0)
          //   dv.writeFloatLE(weightedScores[i].weightedRating, 4)
          //   dv.writeFloatLE(weightedScores[i].simScore, 8)
          //   // wBuffers[y].push(wrBuffer)
          //   wBuffers[y].push(dv)
          //   w++
          // }
          // w--

          //  for (let i = start; i < weightedScores.length - end; i++)
          for (let i = start; i < start + end; i++) {
            // let wrBuffer = new ArrayBuffer(12) // create long buffer for every rating for one movie?
            // // batch and find range for one movieId and set it to one arraybuffer?
            // let dv = new DataView(wrBuffer)
            // dv.setInt32(0, weightedScores[i].movieId, true)
            // dv.setFloat32(4, weightedScores[i].weightedRating, true)
            // dv.setFloat32(8, weightedScores[i].simScore, true)
            // // wBuffers[y].push(wrBuffer)
            // wBuffers[y].push(dv)
            //  w++ // wrong title bug here?
          }
          w--
          //  w+=  end

          // console.log(w)
          // w += end
          // wScoresChunks[y].push(weightedScores[w])

          // let wrBuffer = new ArrayBuffer(12)
          // let dv = new DataView(wrBuffer)
          // dv.setInt32(0, weightedScores[w].movieId, true)
          // dv.setFloat32(4, weightedScores[w].weightedRating, true)
          // dv.setFloat32(8, weightedScores[w].simScore, true)
          // // wBuffers[y].push(wrBuffer)
          // wBuffers[y].push(dv)

          // let wrBuffer = new ArrayBuffer(12) // create long buffer for every rating for one movie?
          // // batch and find range for one movieId and set it to one arraybuffer?
          // let dv = new DataView(wrBuffer)
          // dv.setInt32(0, weightedScores[w].movieId, true)
          // dv.setFloat32(4, weightedScores[w].weightedRating, true)
          // dv.setFloat32(8, weightedScores[w].simScore, true)
          // // wBuffers[y].push(wrBuffer)
          // wBuffers[y].push(dv)

          // next 3 indexes are related
          // wScoresChunks[y].push(weightedScores[w].movieId)
          // wScoresChunks[y].push(weightedScores[w].weightedRating)
          // wScoresChunks[y].push(weightedScores[w].simScore)
        }

        // if (movieChunkIds[y].has(weightedScores[w].movieId)) {
        //   // wScoresChunks[y].push(weightedScores[w])

        //   // let wrBuffer = new ArrayBuffer(12)
        //   // let dv = new DataView(wrBuffer)
        //   // dv.setInt32(0, weightedScores[w].movieId, true)
        //   // dv.setFloat32(4, weightedScores[w].weightedRating, true)
        //   // dv.setFloat32(8, weightedScores[w].simScore, true)
        //   // // wBuffers[y].push(wrBuffer)
        //   // wBuffers[y].push(dv)

        //   let wrBuffer = new ArrayBuffer(12) // create long buffer for every rating for one movie?
        //   // batch and find range for one movieId and set it to one arraybuffer?
        //   let dv = new DataView(wrBuffer)
        //   dv.setInt32(0, weightedScores[w].movieId, true)
        //   dv.setFloat32(4, weightedScores[w].weightedRating, true)
        //   dv.setFloat32(8, weightedScores[w].simScore, true)
        //   // wBuffers[y].push(wrBuffer)
        //   wBuffers[y].push(dv)

        //   // next 3 indexes are related
        //   // wScoresChunks[y].push(weightedScores[w].movieId)
        //   // wScoresChunks[y].push(weightedScores[w].weightedRating)
        //   // wScoresChunks[y].push(weightedScores[w].simScore)
        // }
      }
    }
    console.log('chunk ws:', performance.now() - w1)

    let promises = []

    console.log('spawning forks....')
    let t1 = performance.now()
    for (let i = 0; i < moviesChunks.length; i++) {
      promises.push(spawnFork(moviesChunks[i], wScoresChunks[i], i, wBuffers[i]))
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
    console.log('timer arg', performance.now() - timer)
  })
}

async function spawnFork(moviesData, weightedScores, id, wBuffers) {
  return new Promise((resolve, reject) => {
    let t1 = performance.now()
    let calcScore = fork('./data-utils/scoreCalcId.js', [], {
      execArgv: ['--use-strict'],
      // execArgv: ['--predictable-gc-schedule', '--max-semi-space-size=512', '--allow-natives-syntax'],
      serialization: 'advanced',
    })
    console.log(id, 'spawned in', performance.now() - t1)

    let mValues = []

    // let o1 = performance.now()
    for (let i = 0; i < moviesData.length; i++) {
      // mValues.push(Object.entries(moviesData[i])[0][1])
      mValues.push(moviesData[i].movieId)
      // mValues[i] = moviesData[i].movieId
    }

    // console.log('mvalues', performance.now() - o1)

    process.nextTick(() => {
      calcScore.send({ weightedScores: weightedScores, moviesData: mValues, id: id, wBuffers: wBuffers })
      let t2 = performance.now()
      console.log(`started fork and sent data to id:${id} in `, t2 - t1)
    })

    let wsMovIds = new Set(
      weightedScores.map((ws) => {
        return new Int32Array(ws)[0]
      })
    )

    moviesData = moviesData.filter((m) => wsMovIds.has(m.movieId))

    calcScore.on('message', async (data) => {
      if (data.message === 'alive') {
        // console.timeEnd('fork')
      }

      if (data.message === 'done') {
        setTimeout(() => {
          calcScore.kill()
        }, 5)

        let results = []

        for (let y = 0; y < data.data.length; y++) {
          if (data.data[y].recommendationScore > 0) {
            results.push({
              movieId: data.data[y].movieId,
              title: moviesData[y].title, // movieTitles[i]
              numRatings: moviesData[y].numRatings, // movieNumRatings[i]
              // title: 'moviesData[y].title', // movieTitles[i]
              // numRatings: 'moviesData[y].numRatings,', // movieNumRatings[i]
              recommendationScore: data.data[y].recommendationScore,
            })
          }
        }

        return resolve(results)
      }
    })
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
