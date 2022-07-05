import { findOneCollection, findOnePool } from '../db'
import { Blockchain, NFT, RolloverTerms, Value } from '../entities'
import failure from '../utils/failure'
import logger from '../utils/logger'
import getEthCollectionValuation from './getEthCollectionValuation'
import getFlashLoanSource from './getFlashLoanSource'
import getNFTMetadata from './getNFTMetadata'
import signValuation from './signValuation'

type Params = {
  blockchain: Blockchain
  collectionId: string
  nftId: string
  existingLoan: any
}

export default async function getRolloverTerms({ blockchain, collectionId, nftId, existingLoan }: Params): Promise<RolloverTerms> {
  logger.info(`Fetching loan terms for NFT ID <${nftId}> and collection ID <${collectionId}> on blockchain <${JSON.stringify(blockchain)}>...`)

  switch (blockchain.network) {
  case 'ethereum': {
    const collection = await findOneCollection({ id: collectionId, blockchain })
    if (!collection) throw failure('UNSUPPORTED_COLLECTION')

    const pool = await findOnePool({ address: existingLoan?.pool, blockchain })
    const flashLoanSource = await getFlashLoanSource({ blockchain, poolAddress: existingLoan?.pool })
    if (!pool) throw failure('NO_POOLS_AVAILABLE')

    const nft: NFT = {
      collection,
      id: nftId,
      isSupported: true,
      ...await getNFTMetadata({ blockchain, collectionAddress: collection.address, nftId }),
    }

    const valuation = await getEthCollectionValuation({ blockchain: blockchain as Blockchain<'ethereum'>, collectionAddress: collection.address })
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

    logger.info(`Fetching loan terms for NFT ID <${nftId}> and collection ID <${collectionId}> on blockchain <${JSON.stringify(blockchain)}>... OK`, loanTerms)

    return loanTerms
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
