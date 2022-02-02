/* eslint-disable no-console */

import cors from 'cors'
import express from 'express'
import http from 'http'
import ip from 'ip'
import appConf from './app.conf'
import routes from './routes'

const app = express()

app.use(cors())
app.use('/', routes)

http
  .createServer(app)
  .listen(appConf.port)
  .on('error', (error: NodeJS.ErrnoException) => {
    console.error(error)
  })
  .on('listening', () => {
    console.log(`Starting service on ${ip.address()}:${appConf.port}... OK`)
  })

export default app
