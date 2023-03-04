const express = require('express')
const router = express.Router()
const controller = require('../controllers/recommendationController')

router.route('/users/:id').get(controller.getSimilarUsersById)
router.route('/movies/:id').get(controller.getMovieRecommendationById)

module.exports = router
