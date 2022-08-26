/**
 * @file Simple in-memory global cache.
 */

import _ from 'lodash'
import NodeCache from 'node-cache'
import rethrow from './rethrow'

const DEFAULT_TTL_SECONDS = 60 * 1
const DEFAULT_CHECK_PERIOD_SECONDS = 60 * 10

const cache = new NodeCache({
  stdTTL: DEFAULT_TTL_SECONDS,
  checkperiod: DEFAULT_CHECK_PERIOD_SECONDS,
})

export async function getCache<T>(key: string, setOnMiss?: T | (() => Promise<T>), ttl: number = DEFAULT_TTL_SECONDS): Promise<T> {
  const value = cache.get(key)

  if (value !== undefined) return value as T
  if (setOnMiss === undefined) rethrow(`No cached value found for key ${key}`)

  return setCache(key, setOnMiss, ttl)
}

export async function setCache<T>(key: string, valueOrExpression: T | (() => Promise<T>), ttl: number = DEFAULT_TTL_SECONDS): Promise<T> {
  let value

  if (_.isFunction(valueOrExpression)) {
    value = await valueOrExpression()
  }
  else {
    value = valueOrExpression
  }

  cache.set(key, value, ttl)

  return value
}
