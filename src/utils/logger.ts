import winston from 'winston'

const logger = winston.createLogger({
  exitOnError: false,
  level: 'debug',
  levels: winston.config.syslog.levels,
})

if (process.env.NODE_ENV === 'production') {
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