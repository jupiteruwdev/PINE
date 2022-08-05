import _ from 'lodash'
import winston from 'winston'
import appConf from '../app.conf'

const allLogLevels = ['error', 'warn', 'info', 'debug', 'verbose']

const logger = winston.createLogger({
  exitOnError: false,
  level: appConf.env === 'test' ? appConf.tests.logLevel : appConf.logLevel,
  levels: _.pick(winston.config.npm.levels, ...allLogLevels),
  silent: appConf.env === 'test' ? !_.includes(allLogLevels, appConf.tests.logLevel) : !_.includes(allLogLevels, appConf.logLevel),
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
