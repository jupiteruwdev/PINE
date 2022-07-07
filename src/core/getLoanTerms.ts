import BigNumber from 'bignumber.js'
import { findOneCollection, findOnePool } from '../db'
import { Blockchain, LoanTerms, NFT, Value } from '../entities'
import fault from '../utils/fault'
import logger from '../utils/logger'
import getEthCollectionValuation from './getEthCollectionValuation'
import getNFTMetadata from './getNFTMetadata'
import getPoolUtilization from './getPoolUtilization'
import signValuation from './signValuation'

type Params = {
  blockchain: Blockchain
  collectionAddress: string
  nftId: string
}

export default async function getLoanTerms({ blockchain, collectionAddress, nftId }: Params): Promise<LoanTerms> {
  logger.info(`Fetching loan terms for NFT ID <${nftId}> and collection Address <${collectionAddress}> on blockchain <${JSON.stringify(blockchain)}>...`)

  try {
    switch (blockchain.network) {
    case 'ethereum': {
      const collection = await findOneCollection({ address: collectionAddress, blockchain })
      if (!collection) throw fault('ERR_UNSUPPORTED_COLLECTION')

      const pool = await findOnePool({ collectionAddress: collection.address, blockchain })
      if (!pool) throw fault('ERR_NO_POOLS_AVAILABLE')

      const utilization = await getPoolUtilization({ blockchain, poolAddress: pool.address })

      const nft: NFT = {
        collection,
        id: nftId,
        isSupported: true,
        ...await getNFTMetadata({ blockchain, collectionAddress: collection.address, nftId }),
      }

      const valuation = await getEthCollectionValuation({ blockchain: blockchain as Blockchain<'ethereum'>, collectionAddress: collection.address })
      const { signature, issuedAtBlock, expiresAtBlock } = await signValuation({ blockchain, nftId, collectionAddress: collection.address, poolAddress: pool.address, valuation })

      const loanTerms: LoanTerms = {
        routerAddress: pool.routerAddress,
        valuation,
        signature,
        options: pool.loanOptions,
        nft,
        issuedAtBlock,
        expiresAtBlock,
        poolAddress: pool.address,
        collection,
      }

      loanTerms.options.map(option => {
        option.maxBorrow = Value.$ETH(option.maxLTVBPS.div(10_000).times(loanTerms.valuation.value?.amount ?? 0))
      })

      if (pool.ethLimit !== undefined && loanTerms.options.some(option => utilization.amount.plus(option.maxBorrow?.amount ?? new BigNumber(0)).gt(new BigNumber(pool.ethLimit ?? 0)))) throw fault('ERR_POOL_OVER_LENDER_DEFINED_UTILIZATION')

      logger.info(`Fetching loan terms for NFT ID <${nftId}> and collection address <${collectionAddress}> on blockchain <${JSON.stringify(blockchain)}>... OK:`, loanTerms)

      return loanTerms
    }
    default:
      throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    }
  }
  catch (err) {
    logger.error(`Fetching loan terms for NFT ID <${nftId}> and collection address <${collectionAddress}> on blockchain <${JSON.stringify(blockchain)}>... ERR:`, err)

    throw err
  }
}
