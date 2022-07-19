import request from 'graphql-request'
import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain } from '../../entities'
import fault from '../../utils/fault'

export type Options = {
  networkId?: string
}

export default function getRequest<T>(query: string) {
  return async (params: T, { networkId = Blockchain.Ethereum.Network.MAIN }: Options = {}) => {
    const apiUrl = _.get(appConf.subgraphAPIUrl, networkId)

    if (apiUrl === undefined) throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')

    return request(apiUrl, query, params)
  }
}
