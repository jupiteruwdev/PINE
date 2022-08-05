/* eslint-disable no-console */
import SuperError from '@andrewscwei/super-error'
import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import http from 'http'
import ip from 'ip'
import _ from 'lodash'
import appConf from './app.conf'
import { initDb } from './db'
import routes from './routes'
import logger from './utils/logger'

initDb()
const app = express()

app.use(cors())
app.use(express.json())
app.use('/', routes)

app.use('*', (req, res, next) => {
  const error = new Error(`Path <${req.baseUrl}> requested by IP ${req.ip} not found`)
  _.set(error, 'status', 404)
  next(error)
})

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const status = (err as any).status ?? 500

  res.setHeader('Content-Type', 'application/json')

  if (status === 404) {
    logger.warning(`Handling 404 error... SKIP: ${err}`)
  }
  else if (appConf.env === 'production') {
    logger.error('Handling 500 error... ERR:', err)
  }
  else {
    logger.error('Handling 500 error... ERR:')
    /* eslint-disable-next-line no-console */
    console.error(err)
  }

  res.status(status).json({
    error: SuperError.serialize(err),
  })
})

http
  .createServer(app)
  .listen(appConf.port)
  .on('error', (error: NodeJS.ErrnoException) => {
    logger.error('Handling Node exception... ERR:', error)
  })
  .on('listening', () => {
    logger.info(`⚡ Starting service on ${ip.address()}:${appConf.port}... OK`)
  })

export default app
