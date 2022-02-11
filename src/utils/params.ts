import _ from 'lodash';
import { BlockchainDict, EthBlockchain } from '../entities/Blockchain';
import { EthNetwork, parseEthNetworkId } from './ethereum';

export function parseBlockchains(params?: Record<string, any>): BlockchainDict {
  const ethereumNetworkId = parseEthNetworkId(_.get(params, 'ethereum', EthNetwork.MAIN))

  return {
    ethereum: EthBlockchain(ethereumNetworkId),
  }
}
