/* eslint-disable no-console */

import cors from 'cors'
import express from 'express'
import http from 'http'
import ip from 'ip'
import appConf from './app.conf'
import routes from './routes'
import logger from './utils/logger'

const app = express()

app.use(cors())
app.use('/', routes)

http
  .createServer(app)
  .listen(appConf.port)
  .on('error', (error: NodeJS.ErrnoException) => {
    logger.error(error)
  })
  .on('listening', () => {
    logger.info(`Starting service on ${ip.address()}:${appConf.port}... OK`)
  })

export default app
