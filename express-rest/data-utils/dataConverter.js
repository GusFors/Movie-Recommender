// used when converting the original csv files to json for easier use
const csv = require('csvtojson')
const converter = csv({ delimiter: ',' })
const fs = require('fs')

const args = process.argv.slice(2)

converter.fromFile(args[0]).then((convertedCsv) => {
  let data = []
  for (let i = 0; i < convertedCsv.length; i++) {
    let dataObj = {}
  
    dataObj.userId = convertedCsv[i].userId
    dataObj.movieId = convertedCsv[i].movieId
    dataObj.rating = convertedCsv[i].rating
    data.push(dataObj)
  }

  try {
    fs.writeFileSync(args[1], JSON.stringify(data))
  } catch (err) {
    console.error(err)
  }
})
