import _ from 'lodash'
import { supportedCollections } from '../config/supportedCollecitons'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import Pool from '../entities/Pool'
import { parseEthNetworkId } from '../utils/ethereum'
import getPool from './getPool'

/**
 * Fetches all existing pools.
 *
 * @param blockchains - Blockchains to filter for the returned pools. If unspecified, all
 *                      blockchains with default network ID will be used. Otherwise pass in an array
 *                      of {@link Blockchain} to only include pools in those blockchains.
 *
 * @returns An array of {@link Pool}.
 */
export default async function getPools(blockchains: Blockchain[] = []) {
  const rawData = supportedCollections
  const ethBlockchain = blockchains === undefined ? EthBlockchain() : blockchains.find(blockchain => blockchain.network === 'ethereum')

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
