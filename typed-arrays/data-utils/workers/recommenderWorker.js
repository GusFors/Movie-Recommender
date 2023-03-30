'use strict'

const { Worker } = require('worker_threads')

const recommender = {}

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
