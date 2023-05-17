'use strict'

const { fork } = require('child_process')

const recommender = {}

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
    for (let r = arr.length - (arr.length % chunkCnt); r <= arr.length - 1; r++) {
      temp[temp.length - 1].push(arr[r])
    }
  }

  return temp
}

module.exports = recommender
