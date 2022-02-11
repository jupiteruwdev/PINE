import _ from 'lodash'
import { supportedCollections } from '../config/supportedCollecitons'
import { BlockchainDict } from '../entities/Blockchain'
import Pool from '../entities/Pool'
import { parseEthNetworkId } from '../utils/ethereum'
import { parseBlockchains } from '../utils/params'
import getPool from './getPool'

/**
 * Fetches all existing pools.
 *
 * @param blockchainFilter - Blockchains to filter for the returned pools. If unspecified, all
 *                           blockchains with default network ID will be used. Only blockchains that
 *                           appear in this dict will be included in the returned results.
 *
 * @returns An array of {@link Pool}.
 */
export default async function getPools(blockchainFilter: Partial<BlockchainDict> = parseBlockchains()): Promise<Pool[]> {
  const rawData = supportedCollections
  const ethBlockchain = blockchainFilter.ethereum
  const requests: Promise<Pool[]>[] = []

  if (ethBlockchain) {
    const collectionIds = Object.keys(rawData).filter(collectionId => parseEthNetworkId(rawData[collectionId].networkId) === ethBlockchain.networkId)

    requests.push(Promise.all(collectionIds.map(async collectionId => {
      const collectionData = rawData[collectionId]
      const poolAddress = collectionData.lendingPool.address
      return getPool({ poolAddress }, ethBlockchain)
    })))
  }

  const pools = _.flatten(await Promise.all(requests))

  return pools
}
