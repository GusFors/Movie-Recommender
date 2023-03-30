'use strict'

const { fork } = require('child_process')
const { Worker } = require('worker_threads')
// const { deflate, inflate, deflateSync, inflateSync } = require('zlib')
// const { serialize, deserialize } = require('v8')

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
  // console.log('euscores userAmovIdsSet:', userAMovIds)
  console.log('relevantScoresUserIds.includes(506):', relevantScoresUserIds.includes(506))
  console.log('relevantScoresMovIds.includes(68269)', relevantScoresMovIds.includes(68269))

  let i1 = performance.now()
  let matchesIndexes = []
  let othersRatingUserIds = []
  let otherScores = []
  let otherMovIds = []
  let ignoredMovieIds = []
  let ignoredUserIds = []

  for (let r = 0, l = relevantScoresMovIds.length; r < l; r++) {
    // if (userAMovIds.has(relevantScoresMovIds[r]))
    if (userAMovIdsM.has(relevantScoresMovIds[r])) {
      // matchesIndexes.push(aMatchScores.indexOf(relevantScoresMovIds[r])) // store value instead? ~3.2ms
      othersRatingUserIds.push(relevantScoresUserIds[r])
      otherScores.push(relevantScoresRatings[r])
      otherMovIds.push(relevantScoresMovIds[r])
    } else {
      ignoredMovieIds.push(relevantScoresMovIds[r])
      ignoredUserIds.push(relevantScoresUserIds[r])
    }
  }
  // console.log('indexof match took', performance.now() - i1)
  console.log('othersRatingUserIds.includes(506):', othersRatingUserIds.includes(506))
  console.log('otherMovIds.includes(68269)', otherMovIds.includes(68269))
  console.log(ignoredMovieIds.includes(68269))
  // console.log(new Set(ignoredMovieIds))
  // console.log(new Set(ignoredUserIds).size)
  // console.log(matchesIndexes)

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

recommender.getMoviesNotSeenByUser = (userId, ratingsDataObj) => {}

recommender.getMoviesSeenByUser = (userId, ratingsDataObj) => {
  let moviesSeenByUser = new Set()
  // let moviesSeenByUser = []

  let r1 = performance.now()
  // let isUser = false
  for (let i = 0, l = ratingsDataObj.u.length; i < l; i++) {
    if (ratingsDataObj.u[i] === userId) {
      moviesSeenByUser.add(ratingsDataObj.m[i])
      // moviesSeenByUser.push(ratingsDataObj.m[i])
    }
  }
  console.log('found user ratings in', performance.now() - r1)

  return moviesSeenByUser
}

recommender.getWeightedScoresMoviesNotSeenByUser = (userId, ratingsDataObjR, similarityScores) => {
  let ratingsDataObj = ratingsDataObjR // ratingsDataObjR.deref()

  let ratingsLength = ratingsDataObj.u.length

  let moviesSeenByUser = new Set()
  let movIdFilter = recommender.getIgnoredMovieIds(userId, ratingsDataObj)
  console.log('movIdFilter.has(68269)', movIdFilter.has(68269))
  let r1 = performance.now()
  // let isUser = false
  for (let i = 0, l = ratingsLength; i < l; i++) {
    if (ratingsDataObj.u[i] === userId) {
      moviesSeenByUser.add(ratingsDataObj.m[i])
    }
  }
  console.log('found user ratings in', performance.now() - r1)
  // console.log(moviesSeenByUser.size)

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

  console.log('movIds.includes(68269)', movIds.includes(68269))
  console.log('userIds.includes(506)', userIds.includes(506))

  // console.log('w section took', performance.now() - t1)
  let weightedScores = []
  let simUids = new Uint32Array(similarityScores.userIds)
  let simScores = new Float32Array(similarityScores.scores)

  console.log('simUids.includes(506)', simUids.includes(506))

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

  // console.log(
  //   'weightedScores.find((w) => w.movieId === 68159)',
  //   weightedScores.find((w) => w.movieId === 68159)
  // )
  console.log(
    'weightedScores.find((w) => w.movieId === 68269)',
    weightedScores.find((w) => w.movieId === 68269)
  )
  return weightedScores
}

recommender.getMovieIdsAboveMinNumRatings = (minNumRatings, moviesData) => {
  // console.log(moviesData)
  let movieIdsAboveMin = []
  for (let i = 0; i < moviesData.length; i++) {
    if (moviesData[i].numRatings >= minNumRatings) {
      movieIdsAboveMin.push(moviesData[i].movieId)
    }
  }
  // console.log(movieIdsAboveMin)
  return movieIdsAboveMin
}

// spawn forks early before doing calculations to skip some of the delay? send data later
recommender.getMovieRecommendationForkScores = async (weightedScoresA, moviesData, threads, timer) => {
  return new Promise((resolve, reject) => {
    let movieRecommendations = []

    // console.log(weightedScores) // check if simscores are correct, many are the same

    // let wSmovIds = new Set()

    // for (let j = 0; j < weightedScores.length; j++) {
    //   wSmovIds.add(weightedScores[j].movieId)
    // }

    // console.log(wSmovIds.size)
    // console.timeLog('movierecs')

    // console.timeEnd('movierec')

    // console.log(wSmovIds)
    // console.log(moviesData.length)
    // moviesData = moviesData.filter((m) => wSmovIds.has(m.movieId))
    // console.log(moviesData.length)

    // console.time('fork') // first onmessage takes around 65ms extra

    let weightedScores = weightedScoresA.sort((a, b) => {
      // sort typed arrays with ids faster?
      // return a[0] - b[0]
      return a.movieId - b.movieId
    })

    let m1 = performance.now()
    // for (let r = 0; r < moviesData.length; r++) {
    //   let holder = moviesData[r]
    //   let newIndex = Math.floor(Math.random() * (moviesData.length - 1)) // -1?
    //   moviesData[r] = moviesData[newIndex]
    //   moviesData[newIndex] = holder
    // }
    // console.log(weightedScores)
    console.log('randomize in:', performance.now() - m1)
    let r1 = performance.now()
    //  let moviesChunks = chunk.arrayChunkSplit(moviesData, threads)
    let moviesChunks = arrayChunkPush(moviesData, threads)
    // console.log(moviesChunks)
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
      // movieChunkIds[y] = new Set(movieChunkIds[y])

      let forkMovData = []
      wScoresChunks[y] = []
      wBuffers[y] = []
      for (let w = 0; w < weightedScores.length; w++) {
        if (movieChunkIds[y].has(weightedScores[w].movieId)) {
          // if (weightedScores[w].movieId === 68269) {
          //   console.log('2minratin 1 thread')
          // }

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
    // console.log(moviesChunks[0])
    // console.log(movieChunkIds)
    let promises = []

    console.log('spawning forks....')
    let t1 = performance.now()
    // for (let i = 0; i < moviesChunks.length; i++) {
    //   promises.push(spawnFork([...movieChunkIds[i]], wScoresChunks[i], i))
    // }

    for (let i = 0; i < moviesChunks.length; i++) {
      promises.push(spawnFork(moviesChunks[i], wScoresChunks[i], i, wBuffers[i]))
    }

    let t2 = performance.now()
    console.log('forks spawned after', t2 - t1)

    Promise.all(promises).then((values) => {
      // console.log('async?')
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
    // console.log(moviesData[0])
    console.log(id, 'spawned in', performance.now() - t1)

    // console.log(Object.values(weightedScores[0]), weightedScores[0])
    // let wsValues = []
    // for (let i = 0; i < weightedScores.length; i++) {
    //   wsValues.push(Object.values(weightedScores[i]))
    // }
    // console.log(moviesData)
    let mValues = []
    // for (let i = 0; i < moviesData.length; i++) {
    //   mValues.push(Object.values(moviesData[i]))
    // }

    // let o1 = performance.now()
    // console.log(moviesData)
    for (let i = 0; i < moviesData.length; i++) {
      // mValues.push(Object.entries(moviesData[i])[0][1])
      mValues.push(moviesData[i].movieId)
      // mValues[i] = moviesData[i].movieId
    }
    // console.log(weightedScores[0])

    // console.log('object entries:', performance.now() - o1)

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
        // console.log(data.data[0], moviesData.length, data.data.length)
        // console.log(
        //   moviesData.map((v) => {
        //     return v.movieId
        //   })
        // )

        // console.log(
        //   data.data.map((v) => {
        //     return v.movieId
        //   })
        // )

        let movMap = new Set(
          moviesData.map((v) => {
            return v.movieId
          })
        )

        let dataMovIds = data.data.map((v) => {
          return v.movieId
        })

        let movIds = [...movMap]

        // example, 2 minNumRatings, 3 threads,
        // 10011001111110100 // 78836
        // 10011001110110100 // 78772
        //           1000000

        // let out = new Int32Array(4)
        // console.log(out[5] = 2)
        // console.log(out)
        // not sure if movids or dataids are wrong since recommendation score is right for the given id, title is wrong(and ratings)
        // or just maybe just shifted sometimes
        // previous value fine
        // dataMovId: 68237 movId: 68237 // cnt === 0, value before mismatch

        // dataMovId: 68319 movId: 68269 1110010
        // dataMovId: 68358 movId: 68319 111011001
        // dataMovId: 68486 movId: 68358 10000000
        // dataMovId: 68554 movId: 68486 1001100
        // dataMovId: 68659 movId: 68554 11111111001
        // dataMovId: 68791 movId: 68659 10000100
        // dataMovId: 68793 movId: 68791 1110
        // dataMovId: 68848 movId: 68793 1001001
        // dataMovId: 68932 movId: 68848 110110100
        // dataMovId: 68945 movId: 68932 10101
        // dataMovId: 68952 movId: 68945 1001
        // dataMovId: 68954 movId: 68952 10

        let cnt = 0
        // 1minrating, 1 thread 12 elements are wrong?
        // 2minrating 1 thread, data.data skips 68269 value? rest recs above shifted
        for (let i = 0; i < dataMovIds.length; i++) {
          if (movIds[i] !== dataMovIds[i]) {
            if (cnt < 12 || movIds[i] === 78836) {
              if (cnt === 0) {
                // console.log(
                //   data.data
                //     .filter((v) => {
                //       if (v.movieId >= dataMovIds[i] -160) return 1 // - 10
                //     })
                //     .map((v) => {
                //       return v.movieId
                //     })
                // )
                // console.log(
                //   moviesData
                //     .filter((v) => {
                //       if (v.movieId >= movIds[i] -10) return 1
                //     })
                //     .map((v) => {
                //       return v.movieId
                //     })
                // )
                // console.log('dataMovId:', dataMovIds[i - 1], 'movId:', movIds[i - 1], (dataMovIds[i - 1] ^ movIds[i - 1]).toString(2))
              }

              // console.log('dataMovId:', dataMovIds[i], 'movId:', movIds[i], (dataMovIds[i] ^ movIds[i]).toString(2))
              if (movIds[i] === 78836) {
                // console.log(
                //   moviesData.find((m) => m.movieId === 78836),
                //   moviesData.find((m) => m.movieId === 78772)
                // )
              }
            }
            cnt++
            // console.log('dataMovId:', dataMovIds[i], 'movId:', movIds[i], dataMovIds[i] ^ movIds[i]) //
          }
          // if (!movMap.has(dataMovIds[i])) {

          // }
        }

        // console.log(data.data.find((v) => v.movieId === 178827))

        // console.log('data length', data.data.length)
        for (let y = 0; y < data.data.length; y++) {
          if (y < 3) {
            // console.log(data.data[y].movieId, moviesData[y])
          }
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
        // console.log(results)
        return resolve(results)
        // return resolve(data.data)
      }
    })
  })
}

recommender.getMovieRecommendationWorkerScores = async (weightedScores, moviesData, threads) => {
  return new Promise((resolve, reject) => {
    let movieRecommendations = []

    let r1 = performance.now()
    for (let r = 0; r < moviesData.length; r++) {
      let holder = moviesData[r]
      let newIndex = Math.floor(Math.random() * moviesData.length) // randomize to more evenly distribute ratings across threads since most likely older movies have more ratings
      // let newIndex = Math.floor(Math.random() * moviesData.length) || moviesData.length - r
      moviesData[r] = moviesData[newIndex]
      moviesData[newIndex] = holder
    }

    // let moviesChunks = chunk.arrayChunkSplit(moviesData, threads)
    let moviesChunks = arrayChunkPush(moviesData, threads)

    let movieChunkIds = []
    let wScoresChunks = []
    for (let y = 0; y < moviesChunks.length; y++) {
      if (!movieChunkIds[y]) {
        movieChunkIds[y] = new Set()
      }
      for (let j = 0; j < moviesChunks[y].length; j++) {
        movieChunkIds[y].add(moviesChunks[y][j].movieId)
      }
      // movieChunkIds[y] = new Set(movieChunkIds[y])
      wScoresChunks[y] = []
      for (let w = 0; w < weightedScores.length; w++) {
        if (movieChunkIds[y].has(weightedScores[w].movieId)) {
          wScoresChunks[y].push(weightedScores[w])
        }
      }
    }
    console.log('randomize in:', performance.now() - r1)
    let promises = []

    console.log('spawning workers....')
    let t1 = performance.now()
    for (let i = 0; i < moviesChunks.length; i++) {
      promises.push(spawnWorker(moviesChunks[i], wScoresChunks[i], i))
    }
    let t2 = performance.now()
    console.log('workers spawned after', t2 - t1)

    Promise.all(promises).then((values) => {
      let ti1 = performance.now()
      for (let i = 0; i < values.length; i++) {
        for (let j = 0; j < values[i].length; j++) {
          movieRecommendations.push(values[i][j])
        }
      }
      let t2 = performance.now()
      console.log('put together workers in', t2 - ti1, 'from spawn:', t2 - t1)
      resolve(movieRecommendations)
    })
  })
}

async function spawnWorker(moviesData, weightedScores, id) {
  return new Promise((resolve, reject) => {
    let t1 = performance.now()
    let worker = new Worker('./data-utils/scoreCalcSortW.js', {
      execArgv: [''],
    })
    console.log(id, 'spawned in', performance.now() - t1)

    process.nextTick(() => {
      worker.postMessage({ weightedScores: weightedScores, moviesData: moviesData, id: id })
      let t2 = performance.now()
      console.log(`started worker and sent data to id:${id} in `, t2 - t1)
    })

    worker.on('message', async (data) => {
      if (data.message === 'done') {
        worker.terminate()
        return resolve(data.data)
      }
    })
  })
}

let forks
recommender.getMovieRecommendationForkScoresA = async (weightedScores, moviesData, threads) => {
  return new Promise((resolve, reject) => {
    if (!forks || forks.length < 1) {
      console.log('creating fork arr')

      forks = new Array(threads)
      console.log(forks)
    } else if (forks.length !== threads) {
      console.log('different num of forks requested...')
      for (let i = 0; i < forks.length; i++) {
        if (forks[i]) {
          forks[i].kill()
        }
      }

      forks = new Array(threads)
      console.log(forks)
    }

    let movieRecommendations = []

    for (let r = 0; r < moviesData.length; r++) {
      let holder = moviesData[r]
      let newIndex = Math.floor(Math.random() * moviesData.length)

      moviesData[r] = moviesData[newIndex]
      moviesData[newIndex] = holder
    }

    let r1 = performance.now()

    let moviesChunks = arrayChunkPush(moviesData, threads)
    console.log('chunk movies in:', performance.now() - r1)

    let movieChunkIds = []
    let wScoresChunks = []
    for (let y = 0; y < moviesChunks.length; y++) {
      if (!movieChunkIds[y]) {
        movieChunkIds[y] = new Set()
      }
      for (let j = 0; j < moviesChunks[y].length; j++) {
        movieChunkIds[y].add(moviesChunks[y][j].movieId)
      }
      // movieChunkIds[y] = new Set(movieChunkIds[y])
      wScoresChunks[y] = []
      for (let w = 0; w < weightedScores.length; w++) {
        if (movieChunkIds[y].has(weightedScores[w].movieId)) {
          wScoresChunks[y].push(weightedScores[w])
        }
      }
    }

    let promises = []

    console.log('spawning forks....')
    let t1 = performance.now()
    // for (let i = 0; i < moviesChunks.length; i++) {
    //   promises.push(spawnFork([...movieChunkIds[i]], wScoresChunks[i], i))
    // }
    for (let i = 0; i < moviesChunks.length; i++) {
      promises.push(spawnForkA(moviesChunks[i], wScoresChunks[i], i))
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

async function spawnForkA(moviesData, weightedScores, id) {
  return new Promise((resolve, reject) => {
    let t1 = performance.now()
    let calcScore
    if (!forks[id]) {
      calcScore = fork('./data-utils/scoreCalcSortA.js', [], {
        execArgv: ['--use-strict'],
        // silent: true,
        serialization: 'advanced',
      })
      forks[id] = calcScore
    }
    console.log(id, 'spawned in', performance.now() - t1)
    // forks.push()
    // console.log(calcScore)

    // setTimeout(() => {
    //   forks[id].send({ weightedScores: weightedScores, moviesData: moviesData, id: id })
    //   let t2 = performance.now()
    //   console.log(`started fork and sent data to id:${id} in `, t2 - t1)
    // }, 5)

    process.nextTick(() => {
      forks[id].send({ weightedScores: weightedScores, moviesData: moviesData, id: id })
      let t2 = performance.now()
      console.log(`started fork and sent data to id:${id} in `, t2 - t1)
    })

    // if (forks[id].listeners('message').length < 1) {
    forks[id].on('message', async (data) => {
      // adds additional listener each time
      if (data.message === 'done') {
        // calcScore.kill()
        // console.log('done res')
        return resolve(data.data) // wrong res when not adding new listeners for each call?
      }

      if (data.message === 'selftimeout') {
        forks = []
        console.log('selftimeout, clear forks arr')
      }

      if (data.message === 'timeout') {
        if (forks[id]) {
          forks[id].kill()
          console.log('fork timeout', data.id)
          forks[id] = null
        }
        // console.log(forks)

        // if (forks.length === id + 1) {
        //   console.log('set forks arr to null')
        //   forks = null
        // }
        if (forks.length > 0) {
          let timeoutCnt = 0
          for (let i = 0; i < forks?.length; i++) {
            if (forks[i] === null) {
              timeoutCnt++
            }

            if (timeoutCnt === forks.length && forks.length > 0 && timeoutCnt > 0) {
              // logs several times when 1 thead?
              console.log('set forks arr to empty', forks)
              forks = []
            }
          }
        }
      }
    })
    // }
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

  // console.log(temp)
  return temp
}

function arrayChunkShift(arr, chunkCnt) {
  let mod = arr.length % chunkCnt
  let chunkSize = mod === 0 ? arr.length / chunkCnt : Math.floor(arr.length / chunkCnt)

  let temp = []

  for (let c = 0; c < chunkCnt; c++) {
    temp.push([])
  }

  console.log(temp)
  console.log(chunkSize)

  for (let c = 0; c < chunkCnt; c++) {
    for (let i = 0; i < chunkSize; i++) {
      temp[c].push(arr.shift())
    }
  }
  let rem = arr.length
  console.log(rem)
  if (mod !== 0) {
    for (let r = 0; r < rem; r++) {
      console.log(r)
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

  console.log(temp)
  console.log(chunkSize)

  for (let c = 0; c < chunkCnt; c++) {
    for (let i = 0; i < chunkSize; i++) {
      temp[c].push(arr.pop())
    }
  }
  let rem = arr.length
  console.log(rem)
  if (mod !== 0) {
    for (let r = 0; r < rem; r++) {
      console.log(r)
      temp[0].push(arr.pop())
    }
  }

  return temp
}

recommender.getIgnoredMovieIds = (userId, ratingsDataObjR) => {
  let ratingsDataObj = ratingsDataObjR
  let ratingsLength = ratingsDataObj.u.length

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
  // console.log(userAMovIdsM)
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

    // if (!userAMovIdsM.has(relevantScoresMovIds[r])) {
    //   ignoredMovIds.push(relevantScoresMovIds[r])
    // }
  }

  // console.log('used', otherMovIds.includes(68269))

  let relevantScoresUniqueMovIds = [...new Set(relevantScoresMovIds)]
  let othersRatingUserIdsSet = new Set(othersRatingUserIds)
  let otherMovIdsSet = new Set(otherMovIds)
  let ignoredMovIdsSet = new Set(ignoredMovIds)
  let ignoredUserIdsSet = new Set(ignoredUserIds)
  // let combinedUsedMovIds = new Set([...relevantScoresMovIds ...])
  // console.log(otherMovIdsSet.size)
  // console.log(relevantScoresMovIds.length)
  // relevantScoresMovIds = [...new Set(relevantScoresMovIds)]
  // console.log(relevantScoresMovIds.length)

  // console.log(ignoredMovIds.length)
  // ignoredMovIds = [...new Set(ignoredMovIds)]
  // console.log(ignoredMovIds.length, ignoredMovIds.includes(68269), otherMovIdsSet.has(68269))

  let movIdsToIgnore = []

  for (let r = 0, l = relevantScoresMovIds.length; r < l; r++) {
    // acutally relevantScore length?
    if (!othersRatingUserIdsSet.has(relevantScoresUserIds[r])) {
      movIdsToIgnore.push(relevantScoresMovIds[r])
    }
  }

  // console.log(new Set(movIdsToIgnore))

  // for (let i = 0; i < relevantScoresUniqueMovIds.length; i++) {
  //   if(relevantScoresUniqueMovIds[i] === 68269) {
  //    
  //   }
  //   if (!otherMovIdsSet.has(relevantScoresUniqueMovIds[i])) {
  //     //movIdsToIgnore.push(relevantScoresUniqueMovIds[i])
  //   } else {
  //     movIdsToIgnore.push(relevantScoresUniqueMovIds[i])
  //   }
  // }
  // console.log(new Set(movIdsToIgnore).has(68269))
  // console.log('getothersRatingUserIds.includes(506)', othersRatingUserIds.includes(506), 'ignored')
  return new Set(movIdsToIgnore)
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
      //  simScores.push(uniqueOtherIds[i])
      //  simScores.push(simScore)
    }
  }

  return simScores
}

module.exports = recommender

// recommender.getMovieRecommendationForkScores = async (weightedScores, moviesData, threads) => {
//   return new Promise((resolve, reject) => {
//     let movieRecommendations = []

//     // console.log(weightedScores) // check if simscores are correct, many are the same

//     // let wSmovIds = new Set()

//     // for (let j = 0; j < weightedScores.length; j++) {
//     //   wSmovIds.add(weightedScores[j].movieId)
//     // }

//     // console.log(wSmovIds.size)

//     // console.log(wSmovIds)
//     // console.log(moviesData.length)
//     // moviesData = moviesData.filter((m) => wSmovIds.has(m.movieId))
//     // console.log(moviesData.length)

//     for (let r = 0; r < moviesData.length; r++) {
//       let holder = moviesData[r]
//       let newIndex = Math.floor(Math.random() * moviesData.length)
//       // randomize to more evenly distribute ratings across threads since most likely older movies have more ratings
//       // let newIndex = Math.floor(Math.random() * moviesData.length) || moviesData.length - r
//       moviesData[r] = moviesData[newIndex]
//       moviesData[newIndex] = holder
//     }

//     // console.log('randomize in:', performance.now() - r1)
//     let r1 = performance.now()
//     // let moviesChunks = chunk.arrayChunkSplit(moviesData, threads)
//     let moviesChunks = arrayChunkPush(moviesData, threads)
//     console.log('chunk movies in:', performance.now() - r1)

//     let movieChunkIds = []
//     let wScoresChunks = []
//     for (let y = 0; y < moviesChunks.length; y++) {
//       if (!movieChunkIds[y]) {
//         movieChunkIds[y] = new Set()
//       }
//       for (let j = 0; j < moviesChunks[y].length; j++) {
//         movieChunkIds[y].add(moviesChunks[y][j].movieId)
//       }
//       // movieChunkIds[y] = new Set(movieChunkIds[y])
//       wScoresChunks[y] = []
//       for (let w = 0; w < weightedScores.length; w++) {
//         if (movieChunkIds[y].has(weightedScores[w].movieId)) {
//           wScoresChunks[y].push(weightedScores[w])
//         }
//       }
//     }
//     // console.log(moviesChunks[0])
//     // console.log(movieChunkIds)
//     let promises = []

//     console.log('spawning forks....')
//     let t1 = performance.now()
//     // for (let i = 0; i < moviesChunks.length; i++) {
//     //   promises.push(spawnFork([...movieChunkIds[i]], wScoresChunks[i], i))
//     // }
//     for (let i = 0; i < moviesChunks.length; i++) {
//       promises.push(spawnFork(moviesChunks[i], wScoresChunks[i], i))
//     }
//     let t2 = performance.now()
//     console.log('forks spawned after', t2 - t1)

//     Promise.all(promises).then((values) => {
//       let ti1 = performance.now()
//       for (let i = 0; i < values.length; i++) {
//         for (let j = 0; j < values[i].length; j++) {
//           movieRecommendations.push(values[i][j])
//         }
//       }

//       let t2 = performance.now()
//       console.log('put together forks in', t2 - ti1, 'from spawn:', t2 - t1)

//       resolve(movieRecommendations)
//     })
//   })
// }

// async function spawnFork(moviesData, weightedScores, id) {
//   return new Promise((resolve, reject) => {
//     let t1 = performance.now()
//     let calcScore = fork('./data-utils/scoreCalcSort.js', [], {
//       execArgv: ['--use-strict'],
//       // execArgv: ['--predictable-gc-schedule', '--max-semi-space-size=512', '--allow-natives-syntax'],
//       serialization: 'advanced',
//     }) // seri json seems to get sent slower but calculated faster
//     console.log(id, 'spawned in', performance.now() - t1)

//     process.nextTick(() => {
//       calcScore.send({ weightedScores: weightedScores, moviesData: moviesData, id: id })
//       let t2 = performance.now()
//       console.log(`started fork and sent data to id:${id} in `, t2 - t1)
//     })

//     calcScore.on('message', async (data) => {
//       if (data.message === 'done') {
//         calcScore.kill()
//         return resolve(data.data)
//       }
//     })
//   })
// }

// recommender.warmupOpt = (userId, ratingsData) => {
//   // prettier-ignore
//   %PrepareFunctionForOptimization(recommender.getEuclidianSimScoresForUserR);
//   // prettier-ignore
//   %PrepareFunctionForOptimization(recommender.calcEuclideanScoreA);
//   // prettier-ignore
//   %OptimizeFunctionOnNextCall(recommender.getEuclidianSimScoresForUserR);
//   // prettier-ignore
//   %OptimizeFunctionOnNextCall(recommender.calcEuclideanScoreA);

//   let simScores = recommender.getEuclidianSimScoresForUserR(userId, ratingsData)
//   let ratings = recommender.getRatingsMoviesNotSeenByUserR(userId, ratingsData)
//   recommender.getWeightedScoresTview(simScores, ratings)
//   recommender.getWeightedScoresMoviesNotSeenByUser(userId, ratingsData, simScores)
// }
