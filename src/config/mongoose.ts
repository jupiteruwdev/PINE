import mongoose from 'mongoose'
import appConf from '../app.conf'

const uri = `mongodb+srv://alpha-squirrel:${appConf.mongoPassword}@cluster0.13bjirh.mongodb.net/pine?retryWrites=true&w=majority`
mongoose.connect(uri)

const db = mongoose.connection
db.on('error', console.error.bind(console, 'connection error: '))
db.once('open', function() {
  console.log('Connected successfully')
})
