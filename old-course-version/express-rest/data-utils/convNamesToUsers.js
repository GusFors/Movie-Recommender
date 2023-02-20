// can for example be used with data with common baby names from https://github.com/hadley/data-baby-names

const csv = require('csvtojson')
const converter = csv({ delimiter: ',' })
const fs = require('fs')

const args = process.argv.slice(2)

converter.fromFile(args[0]).then((convertedCsv) => {
  console.log(convertedCsv)
  let users = []
  for (let i = 0; i < convertedCsv.length; i++) {
    // amount of userIds for movieLens dataset
    if (i < 610) {
      let userId = `${i + 1}`
      let userObj = {}
      userObj.userId = userId
      userObj.name = convertedCsv[i].name
      convertedCsv[i] = userObj
      users.push(userObj)
    } else {
      delete convertedCsv[i]
    }
  }

  try {
    fs.writeFileSync(args[1], JSON.stringify(users))
  } catch (err) {
    console.error(err)
  }
})
