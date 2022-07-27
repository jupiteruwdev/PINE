import winston from 'winston'
import appConf from '../app.conf'

const logger = winston.createLogger({
  exitOnError: false,
  level: 'debug',
  levels: winston.config.syslog.levels,
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
    silent: appConf.env === 'test' && !appConf.tests.verboseLogging,
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.errors({ stack: true }),
    ),
  }))
}

export default logger
