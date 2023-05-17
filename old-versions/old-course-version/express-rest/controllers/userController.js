const userController = {}
const dataReader = require('../data-utils/dataReader')

userController.getUsers = async (req, res, next) => {
  res.status(200).json({
    message: 'Retrieved all found users',
    users: await dataReader.getAllUsers(),
  })
}

module.exports = userController
