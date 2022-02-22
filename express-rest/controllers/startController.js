const startController = {}

// sample start controller get
startController.getStart = async (req, res, next) => {
  res.status(200).json({
    message: 'Welcome to the movie recommender API, please visit /recommendations/movies/id',
  })
}

module.exports = startController
