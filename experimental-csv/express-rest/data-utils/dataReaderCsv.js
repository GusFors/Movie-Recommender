const fs = require('fs')
const { open } = require('node:fs/promises')
const DATAPATH = 'standard-data'
const readline = require('node:readline')
const dataReader = {}

const dataHolder = {
  userData: [],
  userIdData: [],
  ratingsData: [],
  movieData: [],
}

dataReader.getMoviesIdLineI = async () => {
  // is only calculating with movieids from ratings enough? maybe not when having minNumRatings?
  return new Promise((resolve, reject) => {
    let t1 = performance.now()

    const rl = readline.createInterface({
      input: fs.createReadStream(`./data/csv-data/small/movies.csv`),
      crlfDelay: Infinity,
    })
    let total = -1
    let cats
    let dataEntries = []
    let movieIds = []
    rl.on('line', function (line) {
      if (total === -1) {
        cats = line.split(',')
        // console.log(cats)
        total++
        return
      }

      // if (total === 1) {
      //   console.log(line[0])
      // }

      movieIds[total] = parseInt(line.split(',')[0]) // after

      total++
      // line.split(',')
      //  console.log(`Line from file: ${line}`)
    })
    rl.on('close', () => {
      let t2 = performance.now()
      console.log('done?', t2 - t1)
      console.log(total)
      console.log(dataEntries)
      console.log(movieIds)
    })
  })
}

dataReader.getUserIdLineI = async () => {
  return new Promise((resolve, reject) => {
    let t1 = performance.now()
    if (!dataHolder.userIdData.size > 0) {
      const rl = readline.createInterface({
        input: fs.createReadStream(`./data/csv-data/small/ratings.csv`),
        crlfDelay: Infinity,
      })
      let total = -1
      let cats
      let dataEntries = []
      let userIds = []
      let userIdSet = new Set()
      rl.on('line', function (line) {
        if (total === -1) {
          cats = line.split(',')
          // console.log(cats)
          total++
          return
        }

        // if (total === 1) {
        //   console.log(line[0])
        // }

        userIds[total] = parseInt(line[0]) // push faster?
        userIdSet.add(parseInt(line.split(',')[0])) // after

        total++
        // line.split(',')
      })
      rl.on('close', () => {
        let t2 = performance.now()
        console.log('done?', t2 - t1)
        dataHolder.userIdData = userIdSet
        // resolve(userIdSet)
        resolve([...dataHolder.userIdData])
        // console.log(total)
        // console.log(dataEntries)
        // console.log(userIds)

        // console.log(userIdSet)
      })
    } else {
      let t2 = performance.now()
      resolve([...dataHolder.userIdData])
      console.log('done?', t2 - t1)

      // resolve(dataHolder.userIdData)
    }
  })
}

dataReader.getRatingsLineI = async () => {
  return new Promise((resolve, reject) => {
    let t1 = performance.now()

    if (!dataHolder.ratingsData.length > 0) {
      const rl = readline.createInterface({
        input: fs.createReadStream(`./data/csv-data/small/ratings.csv`),
        crlfDelay: Infinity,
      })
      let total = -1
      let cats
      let dataEntries = []
      let ratings = []
      rl.on('line', function (line) {
        if (total === -1) {
          cats = line.split(',')
          // console.log(cats)
          total++
          return
        }

        let rating = []
        let ratingValues = line.split(',')

        rating[0] = parseInt(ratingValues[0])
        rating[1] = parseInt(ratingValues[1])
        rating[2] = parseFloat(ratingValues[2])
        ratings.push(rating)
        total++
      })
      rl.on('close', () => {
        let t2 = performance.now()
        console.log('done?', t2 - t1)
        // console.log(total)
        // console.log(dataEntries)
        // console.log(ratings[0])
        // console.log(ratings.length)
        dataHolder.ratingsData = ratings
        resolve(ratings)
      })
    } else {
      let t2 = performance.now()
      console.log('done?', t2 - t1)
      resolve(dataHolder.ratingsData)
    }
  })
}

dataReader.getMoviesLineI = async () => {
  return new Promise((resolve, reject) => {
    let t1 = performance.now()

    const rl = readline.createInterface({
      input: fs.createReadStream(`./data/csv-data/small/movies.csv`),
      crlfDelay: Infinity,
    })
    let total = 0
    let cats
    let dataEntries = []
    rl.on('line', function (line) {
      if (total === 0) {
        cats = line.split(',')
        console.log(cats)
      }

      let dataSplit = line.split(',')
      // for (let i = 0, l = dataSplit.length; i < l; i++) {
      dataEntries[total - 1] = dataSplit
      //}

      total++
      // line.split(',')
    })
    rl.on('close', () => {
      let t2 = performance.now()
      // console.log('done?', t2 - t1)
      // console.log(total)
      // console.log(dataEntries)
    })
  })
}

dataReader.getMovies = async () => {
  return new Promise((resolve, reject) => {
    let t1 = performance.now()
    let m = fs.readFile(`./data/csv-data/small/movies.csv`, 'utf8', (err, data) => {
      if (err) {
        reject(err)
      }
      let t2 = performance.now()

      console.log('data', t2 - t1)
      // console.log(data)
      //resolve(dataHolder.movieData)
    })
  })
}

// dataReader.getMoviesLine = async () => {
//   let t1 = performance.now()

//   let stream = await open(`./data/csv-data/small/movies.csv`)
//   stream.createReadStream
//   //   let arr = []
//   //   stream.on('line', (l) => {
//   //     console.log(l)
//   //   })
//   //   for await (const line of stream.readLines()) {
//   //     // console.log(line)
//   //     arr.push(line)
//   //   }
//   //   console.log(arr.length)
//   //   stream.on('data', (data) => {
//   //     //  console.log(data)
//   //   })
//   //   stream.on('end', () => {
//   //     let t2 = performance.now()

//   //     console.log('ended', t2 - t1)
//   //   })
// }

// dataReader.getMoviesStream = async () => {
//   return new Promise((resolve, reject) => {
//     let t1 = performance.now()
//     let stream = fs.createReadStream(`./data/csv-data/small/movies.csv`, { highWaterMark: 1 })
//     let f = fs.readFileSync(`./data/csv-data/small/movies.csv`)
//     console.log(f)
//     // console.log(stream)
//     let arr = ['']
//     let cnt = 0
//     let lines = []
//     //let lArr = new Uint8Array(23)
//     // lArr.
//     let lineCnt = 0
//     let strIndex = 0
//     let unde
//     let set = false
//     let str = ''
//     stream.on('error', () => {
//       console.log('error')
//     })
//     // stream.on('readable', (d) => {
//     //   let data

//     //   while (true) {
//     //     console.log(stream.readable)
//     //     data = stream.read(1)
//     //     //  while (null !== (data = stream.read(1)))
//     //     //console.log(data)

//     //     if (data[0] === '\r') return
//     //     // console.log(data)
//     //     // console.log(escape(data))
//     //     if (data[0] === '\n') {
//     //       // || data[0] === '\r'
//     //       // console.log(escape(data))

//     //       lineCnt++
//     //       arr[lineCnt] = ''
//     //       return
//     //     }
//     //     if (!set) {
//     //       unde = data
//     //       set = true
//     //     }
//     //     // if (lineCnt > 2) {
//     //     //   stream.close()
//     //     //   return
//     //     // }
//     //     // console.log(data)
//     //     //   console.log(data)
//     //     //   console.log(escape(data))
//     //     // console.log(data.toString())

//     //     //   if (data[0] === 13) {
//     //     //     // console.log(escape(data))
//     //     //     lineCnt++
//     //     //     return
//     //     //   }

//     //     //   if (data.toString() === 'u') {
//     //     //     console.log('whyyyy')
//     //     //   }
//     //     // console.log(arr[lineCnt])
//     //     arr[lineCnt] = arr[lineCnt] + data[0]
//     //     // console.log(arr)
//     //     console.log(data)

//     //
//     //   }

//     //   //   console.log('open:', d)
//     //   //   console.log(stream.read(1))
//     // })
//     let blocked = false
//     let separCnt = 0
//     stream.on('data', (data) => {
//       if (data[0] === 0x2c) {
//         separCnt++
//       }

//       if (data[0] === 0x0d) return
//       // \r
//       // console.log(data)
//       // console.log(escape(data))
//       if (data[0] === 0x0a) {
//         // '\n'
//         // || data[0] === '\r'
//         // console.log(escape(data))

//         lineCnt++
//         arr[lineCnt] = ''
//         blocked = false
//         separCnt = 0
//         return
//       }

//       if (separCnt >= 2) {
//         blocked = true
//       }

//       if (data[0] === 0x7c) {
//         blocked = true
//       }

//       if (blocked) return

//       if (!set) {
//         unde = data
//         set = true
//       }
//       // if (lineCnt > 2) {
//       //   stream.close()
//       //   return
//       // }
//       // console.log(data)
//       //   console.log(data)
//       //   console.log(escape(data))
//       // console.log(data.toString())

//       //   if (data[0] === 13) {
//       //     // console.log(escape(data))
//       //     lineCnt++
//       //     return
//       //   }

//       //   if (data.toString() === 'u') {
//       //     console.log('whyyyy')
//       //   }
//       // console.log(arr[lineCnt])
//       arr[lineCnt] = arr[lineCnt] + data
//       // console.log(arr)
//       // console.log(data)
//     })
//     stream.on('end', () => {
//       console.log('ended')
//     })
//     stream.on('close', () => {
//       //   console.log(lineCnt)
//       console.log(arr)
//       //   console.log(str)
//       //   let sA = [str]
//       //   console.log(sA)
//     })

//     // setTimeout(() => {
//     //   for (let i = 0; i < arr.length; i++) {
//     //     console.log(arr[i].toString())
//     //   }
//     // }, 2000)
//     // setTimeout(() => {
//     //   for (let i = 0; i < 23; i++) {
//     //     console.log(lArr[i].toString(8))
//     //   }
//     // }, 2000)

//     // for (const line of stream.readLines()) {
//     //     console.log(line);
//     //   }
//     // stream.on('close', () => {
//     //   let t2 = performance.now()

//     //   console.log('ended', t2 - t1)
//     //   console.log('length', arr.length)
//     //   // console.log(arr)
//     // })
//     // setTimeout(() => {
//     //   console.log(arr)
//     // }, 2000)
//   })
// }

module.exports = dataReader
