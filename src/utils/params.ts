import _ from 'lodash'
import { AnyBlockchain } from '../entities/Blockchain'
import { EthNetwork, parseEthNetworkId } from './ethereum'

export function parseBlockchainFilterFromQuery(query?: Record<string, any>): { [K in AnyBlockchain]: string } {
  const ethereumNetworkId = parseEthNetworkId(_.get(query, 'ethereum', EthNetwork.MAIN))

  return {
    ethereum: ethereumNetworkId,
  }
}
