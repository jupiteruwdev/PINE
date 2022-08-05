import _ from 'lodash'
import winston from 'winston'
import appConf from '../app.conf'

const logger = winston.createLogger({
  exitOnError: false,
  level: appConf.env === 'test' ? appConf.tests.logLevel : appConf.logLevel,
  levels: _.pick(winston.config.npm.levels, 'error', 'warn', 'info', 'debug', 'verbose'),
  silent: appConf.env === 'test' ? appConf.tests.logLevel === undefined : appConf.logLevel === undefined,
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
