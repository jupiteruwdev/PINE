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

const DEFAULT_CACHE_TTL = 30

export default function getRequest<T>(query: string) {
  return async (params: T, { networkId = Blockchain.Ethereum.Network.MAIN, useCache = true }: Options = {}) => {
    try {
      const apiUrl = _.get(appConf.subgraphAPIUrl, networkId)
      if (apiUrl === undefined) throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')

      const cacheKey = objectHash({ apiUrl, query, params }, { unorderedSets: true, unorderedObjects: true })

      if (useCache === true) {
        return getCache(cacheKey, request(apiUrl, query, params), DEFAULT_CACHE_TTL)
      }
      else {
        return setCache(cacheKey, request(apiUrl, query, params), DEFAULT_CACHE_TTL)
      }
    }
    catch (err) {
      throw fault('ERR_SUBGRAPH_GET_REQUEST', undefined, err)
    }
  }
}
