import { request } from 'graphql-request'
import _ from 'lodash'
import objectHash from 'object-hash'
import appConf from '../../app.conf'
import { Blockchain } from '../../entities'
import { getCache, setCache } from '../../utils/cache'
import fault from '../../utils/fault'

export type Options = {
  networkId?: string
  useCache?: boolean
}

export default function getRequest<T>(query: string) {
  return async (params: T, { networkId = Blockchain.Ethereum.Network.MAIN, useCache = true }: Options = {}) => {
    const apiUrl = _.get(appConf.subgraphAPIUrl, networkId)
    if (apiUrl === undefined) throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')

    const cacheKey = objectHash({ apiUrl, query, params })

    if (useCache === true) {
      return await getCache(cacheKey, request(apiUrl, query, params))
    }
    else {
      return await setCache(cacheKey, request(apiUrl, query, params))
    }
  }
}
