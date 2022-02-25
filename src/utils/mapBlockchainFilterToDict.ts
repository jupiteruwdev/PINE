import Blockchain, { AnyBlockchain, EthBlockchain } from '../entities/lib/Blockchain'
import { parseEthNetworkId } from './ethereum'

export type BlockchainDict = { [K in AnyBlockchain]?: Blockchain<K> }

/**
 * Parses a blockchain network ID filter object and returns a dictionary of **all** blockchains with
 * their desired network ID.
 *
 * @param filter - The filter object to parse. Each unique key is of type {@link AnyBlockchain} and
 *                 each value corresponds to the desired network ID.
 * @param autofillDefaults - Specifies if the default network ID of a blockchain should be included
 *                           in the returned dictionary if it is not specified in the filter object.
 */
export default function mapBlockchainFilterToDict<T extends boolean>(filter: Record<string, any>, autofillDefaults: T): T extends true ? Required<BlockchainDict> : BlockchainDict
export default function mapBlockchainFilterToDict<T extends boolean>(filter: Record<string, any>, autofillDefaults: T): Required<BlockchainDict> | BlockchainDict {
  const ethBlockchain = filter.ethereum === undefined
    ? autofillDefaults ? EthBlockchain() : undefined
    : EthBlockchain(parseEthNetworkId(filter.ethereum))

  return {
    ethereum: ethBlockchain,
  }
}
