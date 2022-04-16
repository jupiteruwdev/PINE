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

    logger.debug(`Making request to <${host ?? ''}${path}> with params <${JSON.stringify(params)}>... OK: status=${res.status}, payload=${JSON.stringify(payload)}`)

    return payload
  }
  catch (err) {
    if (axios.isCancel(err)) {
      logger.warn(`Making request to <${host ?? ''}${path}> with params <${JSON.stringify(params)}>...`, 'CANCEL', err)
      throw failure('REQUEST_CANCELLED', err)
    }
    else if (axios.isAxiosError(err)) {
      const error = err.response?.status === undefined ? new SuperError(undefined, 'system-offline') : SuperError.deserialize(err.response?.data?.error)
      logger.error(`Making request to <${host ?? ''}${path}> with params <${JSON.stringify(params)}>...`, err.response?.status ?? 'ERR', error.code)
      throw error
    }
    else {
      const error = err instanceof TypeError ? err : failure('UNEXPECTED_PAYLOAD')
      logger.error(`Making request to <${host ?? ''}${path}> with params <${JSON.stringify(params)}>... ERR: ${error}`)
      throw error
    }
  }
}
