import _ from 'lodash'
import winston from 'winston'
import appConf from '../app.conf'
import { LoggingWinston } from '@google-cloud/logging-winston'

const allLogLevels = ['error', 'warn', 'info', 'debug']

/**
 * Singleton application-wide logger.
*/
const logger = winston.createLogger({
  exitOnError: false,
  level: appConf.logLevel,
  levels: _.pick(winston.config.npm.levels, ...allLogLevels),
  silent: !_.includes(allLogLevels, appConf.logLevel),
})

if (appConf.env === 'production') {
  logger.add(new LoggingWinston({
    redirectToStdout: true,
    // `useMessageField` option shoud be set because of the issue described here:
    // https://github.com/googleapis/nodejs-logging-winston/issues/704#issuecomment-1209106259
    useMessageField: false,
  }))
}
else {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.errors({ stack: true }),
    ),
  }))
}

export default logger
