import appConf from '../../app.conf'
import { Blockchain, Collection, NFT, RolloverTerms, Value } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import { getEthNFTMetadata } from '../collaterals'
import { getLoan } from '../loans'
import { getPool } from '../pools'
import { getEthNFTValuation, signValuation } from '../valuations'
import getFlashLoanSource from './getFlashLoanSource'

type Params = {
  blockchain: Blockchain
  collectionAddress: string
  nftId: string
  poolAddress?: string
}

export default async function getRolloverTerms({
  blockchain,
  collectionAddress,
  nftId,
  poolAddress,
}: Params): Promise<RolloverTerms> {
  logger.info(`Fetching rollover terms for NFT ID <${nftId}> and collection address <${collectionAddress}> on blockchain <${JSON.stringify(blockchain)}>...`)

  try {
    switch (blockchain.network) {
    case 'ethereum': {
      const existingLoan = await getLoan({ blockchain, nftId, collectionAddress })
      if (!existingLoan || existingLoan.borrowed.amount.lte(existingLoan.returned.amount)) throw fault('ERR_INVALID_ROLLOVER')

      const pool = await getPool({ address: poolAddress, blockchain, includeStats: true })
      const flashLoanSource = await getFlashLoanSource({ blockchain, poolAddress: pool.address })
      if (!pool) throw fault('ERR_NO_POOLS_AVAILABLE')

      const nft: NFT = {
        collection: Collection.factory({ address: collectionAddress, blockchain }),
        id: nftId,
        ...await getEthNFTMetadata({ blockchain, collectionAddress, nftId }),
      }

      const valuation = await getEthNFTValuation({ blockchain: blockchain as Blockchain<'ethereum'>, collectionAddress, nftId })
      const { signature, issuedAtBlock, expiresAtBlock } = await signValuation({ blockchain, nftId, collectionAddress, valuation })

      const loanTerms = RolloverTerms.factory({
        routerAddress: pool.rolloverAddress,
        flashLoanSourceContractAddress: flashLoanSource?.address,
        maxFlashLoanValue: flashLoanSource?.capacity,
        valuation,
        signature,
        options: pool.loanOptions,
        nft,
        issuedAtBlock,
        expiresAtBlock,
        poolAddress: pool.address,
        collection: nft.collection,
      })

      loanTerms.options.map(option => {
        option.maxBorrow = Value.$ETH(option.maxLTVBPS.div(10_000).times(loanTerms.valuation.value?.amount ?? 0).toFixed(appConf.ethMaxDecimalPlaces))
        option.fees = [
          {
            type: 'percentage',
            value: 0.0035,
          },
        ]
      })

      logger.info(`Fetching rollover terms for NFT ID <${nftId}> and collection address <${collectionAddress}> on blockchain <${JSON.stringify(blockchain)}>... OK:`, loanTerms)

      return loanTerms
    }
    default:
      throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    }
  }
  catch (err) {
    logger.error(`Fetching rollover terms for NFT ID <${nftId}> and collection address <${collectionAddress}> on blockchain <${JSON.stringify(blockchain)}>... ERR:`, err)

    throw err
  }
}
