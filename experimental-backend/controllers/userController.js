const userController = {}
// const dataReader = require('../data-utils/old-compatibility/dataReaderRev')

userController.getUsers = async (req, res, next) => {
  res.status(200).json({
    message: 'Retrieved all found users',
    users: [],
  })
}

module.exports = userController
