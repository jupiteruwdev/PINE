import { Blockchain, NFT, RolloverTerms, Value } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import { getEthNFTMetadata } from '../collaterals'
import { getCollection } from '../collections'
import { getLoan } from '../loans'
import { getPool } from '../pools'
import { getEthCollectionValuation, signValuation } from '../valuations'
import getFlashLoanSource from './getFlashLoanSource'

type Params = {
  blockchain: Blockchain
  collectionAddress: string
  nftId: string
}

export default async function getRolloverTerms({
  blockchain,
  collectionAddress,
  nftId,
}: Params): Promise<RolloverTerms> {
  logger.info(`Fetching rollover terms for NFT ID <${nftId}> and collection address <${collectionAddress}> on blockchain <${JSON.stringify(blockchain)}>...`)

  try {
    switch (blockchain.network) {
    case 'ethereum': {
      const collection = await getCollection({ address: collectionAddress, blockchain, nftId })
      if (!collection) throw fault('ERR_UNSUPPORTED_COLLECTION')

      const existingLoan = await getLoan({ blockchain, nftId, collectionAddress })
      if (!existingLoan || existingLoan.borrowed.amount.lte(existingLoan.returned.amount)) throw fault('ERR_INVALID_ROLLOVER')

      const pool = await getPool({ address: existingLoan.poolAddress, blockchain, includeStats: true })
      const flashLoanSource = await getFlashLoanSource({ blockchain, poolAddress: existingLoan.poolAddress })
      if (!pool) throw fault('ERR_NO_POOLS_AVAILABLE')

      const nft: NFT = {
        collection,
        id: nftId,
        isSupported: true,
        ...await getEthNFTMetadata({ blockchain, collectionAddress: collection.address, nftId }),
      }

      const valuation = await getEthCollectionValuation({ blockchain: blockchain as Blockchain<'ethereum'>, collectionAddress: collection.address, tokenId: nftId })
      const { signature, issuedAtBlock, expiresAtBlock } = await signValuation({ blockchain, nftId, collectionAddress: collection.address, poolAddress: pool.address, valuation })

      const loanTerms: RolloverTerms = {
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
        collection,
      }

      loanTerms.options.map(option => {
        option.maxBorrow = Value.$ETH(option.maxLTVBPS.div(10_000).times(loanTerms.valuation.value?.amount ?? 0))
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
