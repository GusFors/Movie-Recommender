const PORT = 4000

const cors = require('cors')
const express = require('express')
const app = express()
app.use(express.json())
app.use(cors())

app.use('/', require('./routes/startRouter'))
app.use('/recommendations', require('./routes/recommendationRouter'))
app.use('/users', require('./routes/userRouter'))

app.use((req, res, next) => {
  res.status(404)
  res.json({ message: '404 - resource not found' })
})

app.use((err, req, res, next) => {
  res.status(err.status || 500)
  res.json({ message: err.message || 'Internal Server Error' })
})

app.listen(PORT, () => console.log(`Listening on port ${PORT}!`))
