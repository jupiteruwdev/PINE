import { findOne as findOneCollection } from '../db/collections'
import { findOne as findOnePool } from '../db/pools'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import LoanTerms from '../entities/LoanTerms'
import { $ETH } from '../entities/Value'
import failure from '../utils/failure'
import logger from '../utils/logger'
import getCollectionValuation from './getCollectionValuation'
import signValuation from './signValuation'

type Params = {
  nftId: string
  collectionId: string
}

export default async function getLoanTerms({ nftId, collectionId }: Params, blockchain: Blockchain = EthBlockchain()): Promise<LoanTerms> {
  logger.info(`Fetching loan terms for NFT ID <${nftId}> and collection ID <${collectionId}> on blockchain <${JSON.stringify(blockchain)}>...`)

  switch (blockchain.network) {
  case 'ethereum': {
    const collection = await findOneCollection({ id: collectionId, blockchain })
    if (!collection) throw failure('UNSUPPORTED_COLLECTION')

    const pool = await findOnePool({ collectionAddress: collection.address, blockchain })
    if (!pool) throw failure('NO_POOLS_AVAILABLE')

    const valuation = await getCollectionValuation({ collectionId })
    const { signature, issuedAtBlock, expiresAtBlock } = await signValuation({ nftId, collectionAddress: collection.address, poolAddress: pool.address, valuation }, blockchain)

    const loanTerms: LoanTerms = {
      collection,
      contractAddress: pool.address,
      expiresAtBlock,
      issuedAtBlock,
      options: pool.loanOptions,
      signature,
      valuation,
    }

    loanTerms.options.map(option => {
      option.maxBorrow = $ETH(Math.floor(option.maxLTVBPS * loanTerms.valuation.value.amount) / 10_000)
    })

    logger.info(`Fetching loan terms for NFT ID <${nftId}> and collection ID <${collectionId}> on blockchain <${JSON.stringify(blockchain)}>... OK`, loanTerms)

    return loanTerms
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
