import SuperError from '@andrewscwei/super-error'
import lw from '@google-cloud/logging-winston'
import { RewriteFrames } from '@sentry/integrations'
import * as Sentry from '@sentry/node'
import * as Tracing from '@sentry/tracing'
import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import http from 'http'
import ip from 'ip'
import _ from 'lodash'
import morgan from 'morgan'
import util from 'util'
import appConf from './app.conf'
import { initDb } from './db'
import { blockchainMiddleware, rateLimitMiddleware } from './middlewares'
import routes from './routes'
import rootCause from './utils/error'
import fault from './utils/fault'
import logger from './utils/logger'

// Remove depth from console logs
util.inspect.defaultOptions.depth = undefined

initDb({
  onError: err => {
    logger.error('Establishing database conection... ERR:', err)
    throw fault('ERR_DB_CONNECTION', undefined, err)
  },
  onOpen: () => {
    logger.info('Establishing database connection... OK')
  },
})

const app = express()
if (appConf.env === 'production') {
  // Sentry configs
  Sentry.init({
    dsn: appConf.sentryApiDsn,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Tracing.Integrations.Express({ app }),
      new RewriteFrames({
        root: '/var/app/build',
      }),
    ],
    tracesSampleRate: 1.0,
  })
  app.use(Sentry.Handlers.requestHandler() as express.RequestHandler)
  app.use(Sentry.Handlers.tracingHandler())

  // GCP error reporting configs
  const mw = await lw.express.makeMiddleware(logger)
  app.use(mw)
}
else {
  app.use(morgan('dev'))
}

app.use(cors())
app.use(express.json())
app.use('/', [rateLimitMiddleware, blockchainMiddleware], routes)

app.use('*', (req, res, next) => {
  const error = new Error(`Path <${req.baseUrl}> requested by IP ${req.ip} not found`)
  _.set(error, 'status', 404)
  next(error)
})

if (appConf.env === 'production') {
  app.use(Sentry.Handlers.errorHandler() as express.ErrorRequestHandler)
}

app.use((err: SuperError, req: Request, res: Response, next: NextFunction) => {
  const status = (err as any).status ?? rootCause(err)

  res.setHeader('Content-Type', 'application/json')

  if (status === 404) {
    if (appConf.env === 'production') {
      (req as any).log.info(`Handling 404 error... SKIP: ${err}`)
    }
    else {
      logger.info(`Handling 404 error... SKIP: ${err}`)
    }
  }
  else if (status >= 500) {
    if (appConf.env === 'production') {
      (req as any).log.error('Handling 500 error... ERR', err)
    }
    else {
      logger.error('Handling 500 error... ERR')
      if (logger.isErrorEnabled() && !logger.silent) console.error(err)
    }
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
    logger.info(`⚡ Starting service ${appConf.version}:${appConf.build} on ${ip.address()}:${appConf.port}... OK`)
  })

export default app
