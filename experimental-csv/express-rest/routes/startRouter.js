const express = require('express')
const router = express.Router()
const controller = require('../controllers/startController')

// sample start point
router.route('/').get(controller.getStart)

module.exports = router
