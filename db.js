const dotenv = require('dotenv')
dotenv.config()

const mongoDB = require('mongodb')


mongoDB.connect(process.env.CONNECTIONSTRING, {useNewUrlParser: true, useUnifiedTopology: true}, function (err, client) {
 module.exports = client
 const app = require('./app')
 app.listen(process.env.PORT)
})