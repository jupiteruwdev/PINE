import SuperError from '@andrewscwei/super-error'
import axios from 'axios'
import appConf from '../../app.conf'
import fault from '../../utils/fault'
import logger from '../../utils/logger'

type Options<T> = {
  controller?: AbortController
  headers?: Record<string, any>
  host?: string
  params?: Record<string, any>
  timeout?: number
  transformPayload?: (data: any) => T
}

export default async function getRequest<T = any>(
  path: string,
  {
    controller,
    host,
    headers,
    params,
    timeout = appConf.requestTimeoutMs,
    transformPayload,
  }: Options<T> = {},
): Promise<T> {
  try {
    const res = await axios.get(path, {
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
  catch (err) {
    if (axios.isCancel(err)) {
      logger.debug(`Making request to <${host ?? ''}${path}>... SKIP`)
      throw fault('ERR_REQUEST_CANCELLED', undefined, err)
    }
    else if (axios.isAxiosError(err)) {
      const error = new SuperError(err.message, err.response?.status.toString(), undefined, err.response?.data as any)
      logger.debug(`Making request to <${host ?? ''}${path}>... ${err.response?.status ?? 'ERR'}`)
      if (logger.isDebugEnabled() && !logger.silent) console.error(error)
      throw error
    }
    else {
      const error = err instanceof TypeError ? err : fault('ERR_UNEXPECTED_PAYLOAD', undefined, err)
      logger.debug(`Making request to <${host ?? ''}${path}>... ERR`)
      if (logger.isDebugEnabled() && !logger.silent) console.error(error)
      throw error
    }
  }
}
