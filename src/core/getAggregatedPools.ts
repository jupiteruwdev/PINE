import { supportedCollections } from '../config/supportedCollecitons'
import AggregatedPool from '../entities/AggregatedPool'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import Collection from '../entities/Collection'
import Pool from '../entities/Pool'
import { $ETH, $USD } from '../entities/Value'
import { getEthValueUSD } from '../utils/ethereum'
import logger from '../utils/logger'
import getPoolCapacity from './getPoolCapacity'
import getPoolUtilization from './getPoolUtilization'

export default async function getAggregatedPools(blockchains: Blockchain[] = []) {
  logger.info('Fetching aggregated pools...')

  const ethValueUSD = await getEthValueUSD()
  const ethBlockchain = blockchains.find(blockchain => blockchain.network === 'ethereum') ?? EthBlockchain()
  const collectionIds = Object.keys(supportedCollections).filter(collectionId => supportedCollections[collectionId].networkId === Number(ethBlockchain.network_id))
  const aggregatedPoolRequests = collectionIds.map<Promise<AggregatedPool>>(async collectionId => {
    const collectionData = supportedCollections[collectionId]
    const poolAddress = collectionData.lendingPool.address
    const [utilization, capacity] = await Promise.all([
      getPoolUtilization({ poolAddress }, ethBlockchain),
      getPoolCapacity({ poolAddress }, ethBlockchain),
    ])

    const collection: Collection = {
      'address': collectionData.address,
      'blockchain': ethBlockchain,
      'id': collectionId,
      'image_url': collectionData.image_url,
      'name': collectionData.display_name,
    }

    const defaultPool: Pool = {
      'address': poolAddress,
      collection,
      // @todo Shouldn't need to map this
      'loan_options': collectionData.lendingPool.loan_options.map((loanOption: any) => ({
        ...loanOption,
        'interest_bps_per_block_override': loanOption.interest_bps_block_override,
        'interest_bps_per_block': loanOption.interest_bps_block,
        'loan_duration_seconds': loanOption.loan_duration_second,
      })),
      'value_locked': $ETH(capacity.amount + utilization.amount),
      'value_lent': utilization,
    }

    return {
      collection,
      'pools': [defaultPool],
      'total_value_lent': $USD(defaultPool.value_lent.amount * ethValueUSD.amount),
      'total_value_locked': $USD(defaultPool.value_locked.amount * ethValueUSD.amount),
    }
  })

  const aggregatedPools = await Promise.all(aggregatedPoolRequests)

  logger.info('Fetching aggregated pools... OK', aggregatedPools)

  return aggregatedPools
}
