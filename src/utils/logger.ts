import _ from 'lodash'
import winston from 'winston'
import appConf from '../app.conf'

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
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.json(),
      winston.format.splat(),
      winston.format.errors({ stack: true }),
    ),
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
