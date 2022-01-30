/* eslint-disable no-console */

import cors from 'cors'
import express from 'express'
import http from 'http'
import routes from './routes'

const app = express()

app.use(cors())
app.use('/', routes)

http
  .createServer(app)
  .listen(8080)
  .on('error', (error: NodeJS.ErrnoException) => {
    console.error(error)
  })
  .on('listening', () => {
    console.log('Starting service... OK')
  })

export default app
