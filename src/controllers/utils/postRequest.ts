import SuperError from '@andrewscwei/super-error'
import axios from 'axios'
import objectHash from 'object-hash'
import appConf from '../../app.conf'
import { getCache, setCache } from '../../utils/cache'
import fault from '../../utils/fault'
import logger from '../../utils/logger'

type Options<T> = {
  controller?: AbortController
  headers?: Record<string, any>
  host?: string
  params?: Record<string, any>
  timeout?: number
  useCache?: boolean
  transformPayload?: (data: any) => T
}

export default async function postRequest<T = any>(
  path: string,
  data: Record<string, any>,
  {
    controller,
    host,
    headers,
    params,
    transformPayload,
    timeout = appConf.requestTimeoutMs,
    useCache = true,
  }: Options<T> = {},
): Promise<T> {
  try {
    const req = async () => {
      const res = await axios.post(path, data, {
        baseURL: host,
        headers,
        params,
        signal: controller?.signal,
        timeout,
      })

      const payload = transformPayload ? transformPayload(res.data) : res.data

      logger.debug(`Making request to <${host ?? ''}${path}>... ${res.status}`)
      logger.debug(JSON.stringify(payload, undefined, 2))

      return payload
    }

    const cacheKey = objectHash({ host, path, data, headers, params }, { unorderedSets: true, unorderedObjects: true })

    if (useCache === true) {
      return await getCache(cacheKey, req)
    }
    else {
      return await setCache(cacheKey, req)
    }
  }
  catch (err) {
    if (axios.isCancel(err)) {
      logger.debug(`Making request to <${host ?? ''}${path}>... SKIP:`)
      throw fault('ERR_REQUEST_CANCELLED', undefined, err)
    }
    else if (axios.isAxiosError(err)) {
      const error = new SuperError(err.message, err.response?.status.toString(), undefined, err.response?.data as any)
      logger.debug(`Making request to <${host ?? ''}${path}>... ${err.response?.status ?? 'ERR'}`)
      if (logger.isDebugEnabled() && !logger.silent) console.error(error)
      throw error
    }
    else {
      const error = err instanceof TypeError ? err : fault('ERR_UNEXPECTED_PAYLOAD')
      logger.debug(`Making request to <${host ?? ''}${path}>... ERR`)
      if (logger.isDebugEnabled() && !logger.silent) console.error(error)
      throw error
    }
  }
}
