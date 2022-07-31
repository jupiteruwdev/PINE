import SuperError from '@andrewscwei/super-error'
import axios from 'axios'
import fault from '../../utils/fault'
import logger from '../../utils/logger'

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

    logger.info(`Making request to <${host ?? ''}${path}>... ${res.status}`)
    // logger.debug(JSON.stringify(payload, undefined, 2))

    return payload
  }
  catch (err) {
    if (axios.isCancel(err)) {
      logger.warn(`Making request to <${host ?? ''}${path}>... SKIP`)
      throw fault('ERR_REQUEST_CANCELLED', undefined, err)
    }
    else if (axios.isAxiosError(err)) {
      const error = err.response?.status === undefined ? fault('ERR_SYSTEM_OFFLINE') : new SuperError(err.message, err.response?.status.toString(), undefined, err.response?.data as any)
      logger.error(`Making request to <${host ?? ''}${path}>... ${err.response?.status ?? 'ERR'}`)
      console.error(error)
      throw error
    }
    else {
      const error = err instanceof TypeError ? err : fault('ERR_UNEXPECTED_PAYLOAD', undefined, err)
      logger.error(`Making request to <${host ?? ''}${path}>... ERR`)
      console.error(error)
      throw error
    }
  }
}
