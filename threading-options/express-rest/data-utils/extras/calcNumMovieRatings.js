// used when calculating and storing how many ratings each movie has
const csv = require('csvtojson')
const converter = csv({ delimiter: ',' })
const fs = require('fs')

const args = process.argv.slice(2)

converter.fromFile('./movies.csv').then((convertedCsv) => {
  let ratings = JSON.parse(fs.readFileSync('./ratings.json'))
  let ratingCnt = {}

  for (let j = 0; j < ratings.length; j++) {
    if (!ratingCnt[ratings[j].movieId]) {
      ratingCnt[ratings[j].movieId] = { cnt: 1 }
    } else {
      ratingCnt[ratings[j].movieId].cnt++
    }
  }

  let data = []
  for (let i = 0; i < convertedCsv.length; i++) {
    let dataObj = {}

    dataObj.movieId = convertedCsv[i].movieId
    dataObj.title = convertedCsv[i].title

    if (ratingCnt[convertedCsv[i].movieId]) {
      dataObj.numRatings = ratingCnt[convertedCsv[i].movieId].cnt
    } else {
      dataObj.numRatings = 0
    }
    data.push(dataObj)
  }

  try {
    fs.writeFileSync('movies.json', JSON.stringify(data))
  } catch (err) {
    console.error(err)
  }
})
