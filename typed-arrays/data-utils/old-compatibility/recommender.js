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
  let userAMovIds = new Set()
  let userAScores = []
  let aMatchScores = []

  let othersRatingUserIds = []
  let otherScores = []
  // let relevantScores = []
  let relevantScoresUserIds = []
  let relevantScoresMovIds = []
  let relevantScoresRatings = []

  let p1 = performance.now()
  for (let r = 0, l = ratingsLength; r < l; r++) {
    if (ratingsDataObj.u[r] === userId) {
      aMatchScores.push(ratingsDataObj.m[r])
      userAMovIds.add(ratingsDataObj.m[r])
      userAScores.push(ratingsDataObj.s[r])
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

  for (let r = 0, l = relevantScoresRatings.length; r < l; r++) {
    if (userAMovIds.has(relevantScoresMovIds[r])) {
      matchesIndexes.push(aMatchScores.indexOf(relevantScoresMovIds[r])) // store value instead?
      othersRatingUserIds.push(relevantScoresUserIds[r])
      otherScores.push(relevantScoresRatings[r])
    }
  }
  console.log('indexof match took', performance.now() - i1)

  let t2 = performance.now()
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
  console.log(moviesSeenByUser.size)

  let userIds = []
  let movIds = []
  let scores = []

  let t1 = performance.now()
  for (let y = 0, l = ratingsLength; y < l; y++) {
    // let c = ratingsDataObj.m[y]
    if (!moviesSeenByUser.has(ratingsDataObj.m[y])) {
      userIds.push(ratingsDataObj.u[y])
      movIds.push(ratingsDataObj.m[y])
      scores.push(ratingsDataObj.s[y])
    }
  }

  console.log('w section took', performance.now() - t1)
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
recommender.getMovieRecommendationForkScores = async (weightedScores, moviesData, threads, timer) => {
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

    console.time('fork') // first onmessage takes around 65ms extra

    for (let r = 0; r < moviesData.length; r++) {
      let holder = moviesData[r]
      let newIndex = Math.floor(Math.random() * moviesData.length)
      moviesData[r] = moviesData[newIndex]
      moviesData[newIndex] = holder
    }

    // console.log('randomize in:', performance.now() - r1)
    let r1 = performance.now()
    // let moviesChunks = chunk.arrayChunkSplit(moviesData, threads)
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
    // console.log(moviesChunks[0])
    // console.log(movieChunkIds)
    let promises = []

    console.log('spawning forks....')
    let t1 = performance.now()
    // for (let i = 0; i < moviesChunks.length; i++) {
    //   promises.push(spawnFork([...movieChunkIds[i]], wScoresChunks[i], i))
    // }

    for (let i = 0; i < moviesChunks.length; i++) {
      promises.push(spawnFork(moviesChunks[i], wScoresChunks[i], i))
    }

    let t2 = performance.now()
    console.log('forks spawned after', t2 - t1)

    Promise.all(promises).then((values) => {
      console.log('async?')
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

async function spawnFork(moviesData, weightedScores, id) {
  return new Promise((resolve, reject) => {
    let t1 = performance.now()
    let calcScore = fork('./data-utils/scoreCalcSort.js', [], {
      execArgv: ['--use-strict'],
      // execArgv: ['--predictable-gc-schedule', '--max-semi-space-size=512', '--allow-natives-syntax'],
      serialization: 'advanced',
    }) // seri json seems to get sent slower but calculated faster

    console.log(id, 'spawned in', performance.now() - t1)

    process.nextTick(() => {
      calcScore.send({ weightedScores: weightedScores, moviesData: moviesData, id: id })

      let t2 = performance.now()
      console.log(`started fork and sent data to id:${id} in `, t2 - t1)
    })

    calcScore.on('message', async (data) => {
      if (data.message === 'alive') {
        console.timeEnd('fork')
      }

      if (data.message === 'done') {
        calcScore.kill()
        return resolve(data.data)
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

  if (arr.length % chunkCnt !== 0) {
    for (let r = arr.length - 1; r >= arr.length - (arr.length % chunkCnt); r--) {
      temp[0].push(arr[r])
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
