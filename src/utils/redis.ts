import { RedisClientType, SetOptions, createClient } from 'redis'
import appConf from '../app.conf'
import logger from './logger'

let redisClient: RedisClientType

type InitOptions = {
  onError?: (error: Error) => void
  onOpen?: () => void
}

export async function initRedis({ onError, onOpen }: InitOptions = {}): Promise<RedisClientType | undefined> {
  if (appConf.env === 'test') {
    logger.warn('Redis disabled on testing')
    return
  }
  const uri = appConf.redisHost

  if (!uri) throw Error('No valid Redis Server URI provided')

  redisClient = createClient({
    url: uri,
  })

  redisClient.on('error', err => onError ? onError(err) : logger.error(`Redis Error: ${err}`))
  redisClient.on('connect', () => onOpen ? onOpen() : logger.info('Redis connected ...'))
  redisClient.on('reconnecting', () => logger.info('Redis reconnecting ...'))
  redisClient.on('ready', () => {
    logger.info('Redis ready!')
  })

  await redisClient.connect()

  return redisClient
}

export async function getRedisCache(key: string): Promise<any | undefined> {
  try {
    if (!redisClient?.isOpen) {
      await initRedis()
    }

    const cacheData = await redisClient.get(key)

    return cacheData ? JSON.parse(cacheData) : cacheData
  }
  catch (err) {
    logger.error('ERR_GET_REDIS_CACHE', undefined, err)
    return null
  }
}

export async function setRedisCache(key: string, data: any, options?: SetOptions): Promise<any> {
  try {
    if (!redisClient?.isOpen) {
      await initRedis()
    }

    const obj = {
      ...data,
      timestamp: Date.now(),
    }

    await redisClient.set(key, JSON.stringify(obj), options)

    logger.info(`Set redis cache for key ${key} and data ${JSON.stringify(data)}... OK`)

    return obj
  }
  catch (err) {
    logger.error('ERR_SET_REDIS_CACHE', undefined, err)
  }
}
