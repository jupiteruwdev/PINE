import BigNumber from 'bignumber.js'
import appConf from '../../app.conf'
import { Blockchain, Collection, LoanTerms, NFT, Value } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import { getEthNFTMetadata } from '../collaterals'
import { getEthCollectionMetadata } from '../collections'
import { getPool } from '../pools'
import { getEthNFTValuation, signValuation } from '../valuations'

type Params = {
  blockchain: Blockchain
  collectionAddress: string
  poolAddress?: string
  nftId: string
}

export default async function getLoanTerms({ blockchain, collectionAddress, nftId, poolAddress }: Params): Promise<LoanTerms> {
  logger.info(`Fetching loan terms for NFT ID <${nftId}> and collection Address <${collectionAddress}> on blockchain <${JSON.stringify(blockchain)}>...`)

  try {
    switch (blockchain.network) {
    case 'ethereum': {
      const pool = await getPool({ address: poolAddress, collectionAddress, blockchain, includeStats: true })
      if (!pool) throw fault('ERR_NO_POOLS_AVAILABLE')

      const nft: NFT = {
        collection: Collection.factory({
          address: collectionAddress,
          blockchain,
          ...await getEthCollectionMetadata({ blockchain, collectionAddress, matchSubcollectionBy: { type: 'poolAddress', value: pool.address } }),
        }),
        id: nftId,
        ...await getEthNFTMetadata({ blockchain, collectionAddress, nftId }),
      }

      const valuation = pool.collection.valuation ?? await getEthNFTValuation({ blockchain: blockchain as Blockchain<'ethereum'>, collectionAddress, nftId })
      const { signature, issuedAtBlock, expiresAtBlock } = await signValuation({ blockchain, nftId, collectionAddress, valuation })

      const loanTerms: LoanTerms = {
        routerAddress: pool.routerAddress,
        valuation,
        signature,
        options: pool.loanOptions,
        nft,
        issuedAtBlock,
        expiresAtBlock,
        poolAddress: pool.address,
        collection: nft.collection,
      }

      loanTerms.options.map(option => {
        option.maxBorrow = Value.$ETH(option.maxLTVBPS.div(10_000).times(loanTerms.valuation.value?.amount ?? 0).toFixed(appConf.ethMaxDecimalPlaces, BigNumber.ROUND_DOWN))
      })

      if (pool.ethLimit !== 0 && loanTerms.options.some(option => pool.utilization.amount.plus(option.maxBorrow?.amount ?? new BigNumber(0)).gt(new BigNumber(pool.ethLimit ?? 0)))) throw fault('ERR_POOL_OVER_LENDER_DEFINED_UTILIZATION')

      logger.info(`Fetching loan terms for NFT ID <${nftId}> and collection address <${collectionAddress}> on blockchain <${JSON.stringify(blockchain)}>... OK`)
      logger.debug(JSON.stringify(loanTerms, undefined, 2))

      return loanTerms
    }
    default:
      throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    }
  }
  catch (err) {
    logger.error(`Fetching loan terms for NFT ID <${nftId}> and collection address <${collectionAddress}> on blockchain <${JSON.stringify(blockchain)}>... ERR`)
    if (logger.isErrorEnabled() && !logger.silent) console.error(err)

    throw err
  }
}
