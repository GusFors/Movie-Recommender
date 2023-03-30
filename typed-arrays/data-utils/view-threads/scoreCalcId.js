'use strict'

process.on('message', (data) => {
  let calcData = []

  // let movieIds = data.moviesData //[]
  // let movieNumRatings = []
  // let movieTitles = []

  let t1 = performance.now()

  let s1 = performance.now()

  // let wScoresortedByMovieId = data.weightedScores.sort((a, b) => {
  //   // sort typed arrays with ids faster?
  //   // return a[0] - b[0]
  //   return a.movieId - b.movieId
  // })

  // console.log(data.weightedScores[0], data.weightedScores[1], data.weightedScores[2])

  // let dw = new DataView(data.weightedScores.buffer, 4, 4)
  // let t = new Float64Array([2])
  // let dw = new DataView(t.buffer)
  // console.log(dw)
  // console.log(dw.getFloat64(0, true))

  // int32:4  float32: 4           float32: 4
  // movId    weightedRating       simScore
  // 2        0.0533333346247673   0.013333333656191826

  // let wrBuffer = new ArrayBuffer(12)
  // let dv = new DataView(wrBuffer)
  // dv.setInt32(0, 2, true)
  // dv.setFloat32(4, 0.0533333346247673, true)
  // dv.setFloat32(8, 0.013333333656191826, true)

  // let movIdView = new Int32Array(wrBuffer, 0, 1)
  // let wrView = new Float32Array(wrBuffer, 4, 1)
  // let simView = new Float32Array(wrBuffer, 8, 1)

  // // let movIdView = new Int32Array(data.weightedScores.buffer)
  // console.log(movIdView[0], wrView[0], simView[0])
  // console.log(wrBuffer)

  // let wv = data.wBuffers[0]
  // console.log(wv)

  // let wScoresortedByMovieId = data.weightedScores
  // let wScoresortedByMovieId = structuredClone(data.weightedScores)
  // let wScoresortedByMovieId = structuredClone(data.weightedScores, {transfer: [data.weightedScores.buffer]})
  // let wScoresortedByMovieId = new Float32Array(data.weightedScores.buffer, 0, data.weightedScores.length) //data.weightedScores
  console.log('sort in:', performance.now() - s1)

  // let wScoresortedByMovieId = data.weightedScores

  let wScoreIds = []
  let wScoreRatings = []
  let wScoreSims = []
  // let e1 = performance.now()
  // console.log(data.wBuffers.length)
  // for (let y = 0, l = data.wBuffers.length; y < l; y++) {
  //   let vi = new DataView(data.wBuffers[y])
  //   wScoreIds.push(vi.getInt32(0, true))
  //   // wScoreRatings.push(vi.getFloat32(4, true))
  //   // wScoreSims.push(vi.getFloat32(8, true))

  //   // if(y === l -3) {
  //   //   console.log('end', wScoresortedByMovieId[y +2])
  //   // }
  // }

  // for (let y = 0, l = wScoresortedByMovieId.length; y < l; y += 3) {
  //   wScoreIds.push(wScoresortedByMovieId[y])
  //   wScoreRatings.push(wScoresortedByMovieId[y + 1])
  //   wScoreSims.push(wScoresortedByMovieId[y + 2])

  //   // if(y === l -3) {
  //   //   console.log('end', wScoresortedByMovieId[y +2])
  //   // }
  // }

  // let n = new DataView(data.wBuffers[0])
  // n.buffer = data.wBuffers[1]
  // let wBuffers = data.wBuffers

  // console.log(movieIds)
  // let views = []
  // for (let i = 0; i < data.wBuffers.length; i++) {
  //   views.push(new DataView(data.wBuffers[i]))
  //   // views.push(new DataView(structuredClone(data.wBuffers[i], {transfer: [data.wBuffers[i]]})))
  // }

  // let views = []
  // for (let i = 0; i < data.wBuffers.length; i++) {
  //   views.push(new DataView(data.wBuffers[i]))
  //   // views.push(new DataView(structuredClone(data.wBuffers[i], {transfer: [data.wBuffers[i]]})))
  // }
  // console.log(data.weightedScores)
  // console.log(wScoreIds)

  // let b = new ArrayBuffer(4)
  // let ar = new Int32Array(b)
  // ar[0] = 256

  // console.log(b)

  // console.log(Buffer.from(b), Buffer.from(b).readInt32LE(0))

  // console.log(data.wBuffers.length, data.weightedScores.length)

  // console.log(new Int32Array(data.weightedScores[0]))

  // let movieIds = [...data.moviesData]
  // console.log(movieIds.length)
  // // console.log(data.moviesData, movieIds.length)
  // // console.log(movieIds.readInt32LE(0), movieIds.readInt32LE(4))
  let c1 = performance.now()

  // for (let i = 0, l = movieIds.length; i < l; i += 1) {
  //   let weightedScoreSum = 0
  //   let simScoreSum = 0

  //   for (let j = 0, w = data.wBuffers.length; j < w; j++) {
  //     // let v = data.wBuffers[j] //new DataView(data.wBuffers[j])
  //     if (movieIds[i] === data.wBuffers[j].readInt32LE(0)) {
  //       // let v = new DataView(data.wBuffers[j])
  //       weightedScoreSum = weightedScoreSum + data.wBuffers[j].readFloatLE(4)
  //       simScoreSum = simScoreSum + data.wBuffers[j].readFloatLE(8)
  //       // weightedScoreSum = weightedScoreSum + v.getFloat32(4, true)
  //       // simScoreSum = simScoreSum + v.getFloat32(8, true)
  //       // alreadyCheckedRatingsIndexes++
  //     }
  //   }

  //   // if (weightedScoreSum > 0) {
  //   calcData.push({
  //     movieId: movieIds[i],
  //     // title: i, // movieTitles[i]
  //     // numRatings: i, // movieNumRatings[i]
  //     recommendationScore: weightedScoreSum / simScoreSum > 0 ? weightedScoreSum / simScoreSum : 0,
  //   })
  //   // }
  // }

  console.log(new Int32Array(data.weightedScores[0])[0])
  // console.log(new Float32Array(data.weightedScores[0]))
  for (let i = 0; i < data.weightedScores.length; i++) {
    let weightedScoreSum = 0
    let simScoreSum = 0
    let floatView = new Float32Array(data.weightedScores[i])
    let int32View = new Int32Array(data.weightedScores[i])
    let id
    for (let j = 0; j < floatView.length; j += 3) {
      if (j === 0) {
        id = int32View[j]
      }
      weightedScoreSum = weightedScoreSum + floatView[j + 1]
      simScoreSum = simScoreSum + floatView[j + 2]
    }
    // console.log(typeof simScoreSum)
    // if (typeof weightedScoreSum / simScoreSum !== Number) {
    //   console.log('...')
    // }
    // typeof x === "number"
    // console.log(typeof weightedScoreSum / simScoreSum)

    // if (weightedScoreSum > 0 && simScoreSum > 0) {
    // if (typeof (weightedScoreSum / simScoreSum) === 'number') {
    // console.log(typeof (weightedScoreSum / simScoreSum))
    calcData.push({
      movieId: new Int32Array(data.weightedScores[i])[0],
      // title: i, // movieTitles[i]
      // numRatings: i, // movieNumRatings[i]
      recommendationScore: typeof (weightedScoreSum / simScoreSum) === 'number' ? weightedScoreSum / simScoreSum : 0,
    })
    // }
    // }
  }

  // let movieIds = data.moviesData

  // for (let i = 0, l = movieIds.length; i < l; i++) {
  //   let weightedScoreSum = 0
  //   let simScoreSum = 0

  //   for (let j = 0, w = data.wBuffers.length; j < w; j++) {
  //     // let v = data.wBuffers[j] //new DataView(data.wBuffers[j])
  //     if (movieIds[i] === data.wBuffers[j].getInt32(0, true)) {
  //       // let v = new DataView(data.wBuffers[j])
  //       weightedScoreSum = weightedScoreSum + data.wBuffers[j].getFloat32(4, true)
  //       simScoreSum = simScoreSum + data.wBuffers[j].getFloat32(8, true)
  //       // weightedScoreSum = weightedScoreSum + v.getFloat32(4, true)
  //       // simScoreSum = simScoreSum + v.getFloat32(8, true)
  //       // alreadyCheckedRatingsIndexes++
  //     }
  //   }

  //   // if (weightedScoreSum > 0) {
  //   calcData.push({
  //     movieId: movieIds[i],
  //     // title: i, // movieTitles[i]
  //     // numRatings: i, // movieNumRatings[i]
  //     recommendationScore: weightedScoreSum / simScoreSum > 0 ? weightedScoreSum / simScoreSum : 0,
  //   })
  //   // }
  // }

  // let movieIds = new DataView(new Int32Array(data.moviesData).buffer)

  // for (let i = 0; i < data.weightedScores.length; i++) {}

  // for (let i = 0, l = movieIds.byteLength; i < l; i += 4) {
  //   let weightedScoreSum = 0
  //   let simScoreSum = 0

  //   for (let j = 0, w = data.wBuffers.length; j < w; j++) {
  //     // let v = data.wBuffers[j] //new DataView(data.wBuffers[j])
  //     if (movieIds.getInt32(i, true) === data.wBuffers[j].getInt32(0, true)) {
  //       // let v = new DataView(data.wBuffers[j])
  //       weightedScoreSum = weightedScoreSum + data.wBuffers[j].getFloat32(4, true)
  //       simScoreSum = simScoreSum + data.wBuffers[j].getFloat32(8, true)
  //       // weightedScoreSum = weightedScoreSum + v.getFloat32(4, true)
  //       // simScoreSum = simScoreSum + v.getFloat32(8, true)
  //       // alreadyCheckedRatingsIndexes++
  //     }
  //   }

  //   // if (weightedScoreSum > 0) {
  //   calcData.push({
  //     movieId: movieIds.getInt32(i, true),
  //     // title: i, // movieTitles[i]
  //     // numRatings: i, // movieNumRatings[i]
  //     recommendationScore: weightedScoreSum / simScoreSum > 0 ? weightedScoreSum / simScoreSum : 0,
  //   })
  //   // }
  // }

  // for (let i = 0, l = movieIds.byteLength; i < l; i+= 4) {
  //   let weightedScoreSum = 0
  //   let simScoreSum = 0

  //   for (let j = 0, w = data.wBuffers.length; j < w; j++) {
  //     // let v = data.wBuffers[j] //new DataView(data.wBuffers[j])
  //     if (movieIds.getInt32(i, true) === data.wBuffers[j].getInt32(0, true)) {
  //       // let v = new DataView(data.wBuffers[j])
  //       weightedScoreSum = weightedScoreSum + data.wBuffers[j].getFloat32(4, true)
  //       simScoreSum = simScoreSum + data.wBuffers[j].getFloat32(8, true)
  //       // weightedScoreSum = weightedScoreSum + v.getFloat32(4, true)
  //       // simScoreSum = simScoreSum + v.getFloat32(8, true)
  //       // alreadyCheckedRatingsIndexes++
  //     }
  //   }

  //   // if (weightedScoreSum > 0) {
  //   calcData.push({
  //     movieId: movieIds.getInt32(i, true),
  //     // title: i, // movieTitles[i]
  //     // numRatings: i, // movieNumRatings[i]
  //     recommendationScore: weightedScoreSum / simScoreSum > 0 ? weightedScoreSum / simScoreSum : 0,
  //   })
  //   // }
  // }

  // for (let i = 0, l = movieIds.byteLength; i < l; i+= 4) {
  //   let weightedScoreSum = 0
  //   let simScoreSum = 0

  //   for (let j = 0, w = views.length; j < w; j++) {
  //     // let v = data.wBuffers[j] //new DataView(data.wBuffers[j])
  //     if (movieIds.getInt32(i, true) === views[j].getInt32(0, true)) {
  //       // let v = new DataView(data.wBuffers[j])
  //       weightedScoreSum = weightedScoreSum + views[j].getFloat32(4, true)
  //       simScoreSum = simScoreSum + views[j].getFloat32(8, true)
  //       // weightedScoreSum = weightedScoreSum + v.getFloat32(4, true)
  //       // simScoreSum = simScoreSum + v.getFloat32(8, true)
  //       // alreadyCheckedRatingsIndexes++
  //     }
  //   }

  //   // if (weightedScoreSum > 0) {
  //   calcData.push({
  //     movieId: movieIds.getInt32(i, true),
  //     // title: i, // movieTitles[i]
  //     // numRatings: i, // movieNumRatings[i]
  //     recommendationScore: weightedScoreSum / simScoreSum > 0 ? weightedScoreSum / simScoreSum : 0,
  //   })
  //   // }
  // }

  // let v
  // for (let i = 0, l = movieIds.length; i < l; i++) {
  //   let weightedScoreSum = 0
  //   let simScoreSum = 0

  //   for (let j = 0, w = wBuffers.length; j < w; j++) {
  //     // let v = data.wBuffers[j] //new DataView(data.wBuffers[j])
  //     if (movieIds[i] === wBuffers[j].getInt32(0, true)) {
  //       // let v = new DataView(data.wBuffers[j])
  //       weightedScoreSum = weightedScoreSum + wBuffers[j].getFloat32(4, true)
  //       simScoreSum = simScoreSum + wBuffers[j].getFloat32(8, true)
  //       // weightedScoreSum = weightedScoreSum + v.getFloat32(4, true)
  //       // simScoreSum = simScoreSum + v.getFloat32(8, true)
  //       // alreadyCheckedRatingsIndexes++
  //     }
  //   }

  //   // if (weightedScoreSum > 0) {
  //   calcData.push({
  //     movieId: movieIds[i],
  //     // title: i, // movieTitles[i]
  //     // numRatings: i, // movieNumRatings[i]
  //     recommendationScore: weightedScoreSum / simScoreSum > 0 ? weightedScoreSum / simScoreSum : 0,
  //   })
  //   // }
  // }

  // for (let i = 0, l = movieIds.length; i < l; i++) {
  //   let weightedScoreSum = 0
  //   let simScoreSum = 0

  //   for (let j = 0, w = wScoreIds.length; j < w; j++) {
  //     if (movieIds[i] === wScoreIds[j]) {
  //       weightedScoreSum = weightedScoreSum + wScoreRatings[j]
  //       simScoreSum = simScoreSum + wScoreSims[j]
  //       // alreadyCheckedRatingsIndexes++
  //     }
  //   }

  //   // if (weightedScoreSum > 0) {
  //   calcData.push({
  //     movieId: movieIds[i],
  //     // title: i, // movieTitles[i]
  //     // numRatings: i, // movieNumRatings[i]
  //     recommendationScore: weightedScoreSum / simScoreSum > 0 ? weightedScoreSum / simScoreSum : 0,
  //   })
  //   // }
  // }

  // for (let i = 0, l = movieIds.length; i < l; i++) {
  //   let weightedScoreSum = 0
  //   let simScoreSum = 0

  //   for (let j = 0, w = data.weightedScores.length; j < w; j += 3) {
  //     if (movieIds[i] === data.weightedScores[j]) {
  //       weightedScoreSum = weightedScoreSum + data.weightedScores[j + 1]
  //       simScoreSum = simScoreSum + data.weightedScores[j + 2]
  //       // alreadyCheckedRatingsIndexes++
  //     }
  //   }

  //   // if (weightedScoreSum > 0) {
  //   calcData.push({
  //     movieId: movieIds[i],
  //     // title: i, // movieTitles[i]
  //     // numRatings: i, // movieNumRatings[i]
  //     recommendationScore: weightedScoreSum / simScoreSum > 0 ? weightedScoreSum / simScoreSum : 0,
  //   })
  //   // }
  // }
  // console.log(calcData.length)

  let c2 = performance.now()
  let t2 = performance.now()

  console.log(`fork with id: ${data.id} took ${t2 - t1}ms to calc`, calcData.length, c2 - c1) // (${process.execArgv})
  process.send({ message: 'done', data: calcData, id: data.id })
})
