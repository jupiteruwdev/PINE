import SuperError from '@andrewscwei/super-error'
import axios from 'axios'
import failure from './failure'
import logger from './logger'

type Options<T> = {
  controller?: AbortController
  host?: string
  headers?: Record<string, any>
  params?: Record<string, any>
  transformPayload?: (data: any) => T
}

export default async function getRequest<T = any>(path: string, { controller, host, headers, params, transformPayload }: Options<T> = {}): Promise<T> {
  try {
    const res = await axios.get(path, {
      baseURL: host,
      headers,
      params,
      signal: controller?.signal,
    })

    const payload = transformPayload ? transformPayload(res.data) : res.data

    logger.debug(`Making request to <${host ?? ''}${path}>... OK [${res.status}]`, payload)

    return payload
  }
  catch (err) {
    if (axios.isCancel(err)) {
      logger.warn(`Making request to <${host ?? ''}${path}>...`, 'CANCEL', err)
      throw failure('REQUEST_CANCELLED', err)
    }
    else if (axios.isAxiosError(err)) {
      const error = err.response?.status === undefined ? failure('SYSTEM_OFFLINE') : new SuperError(err.message, err.response?.status.toString(), err.response?.data as any, err)
      logger.error(`Making request to <${host ?? ''}${path}>...`, err.response?.status ?? 'ERR', error.code)
      throw error
    }
    else {
      const error = err instanceof TypeError ? err : failure('UNEXPECTED_PAYLOAD')
      logger.error(`Making request to <${host ?? ''}${path}>... ERR: ${error}`)
      throw error
    }
  }
}
