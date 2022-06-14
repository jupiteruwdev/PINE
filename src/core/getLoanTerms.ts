import { routerAddresses } from '../config/supportedCollections'
import { findOne as findOneCollection } from '../db/collections'
import { findOne as findOnePool } from '../db/pools'
import { Blockchain, LoanTerms, NFT, $ETH } from '../entities'
import failure from '../utils/failure'
import logger from '../utils/logger'
import getEthCollectionValuation from './getEthCollectionValuation'
import getNFTMetadata from './getNFTMetadata'
import getPoolContract from './getPoolContract'
import signValuation from './signValuation'

type Params = {
  blockchain: Blockchain
  collectionId: string
  nftId: string
}

export default async function getLoanTerms({ blockchain, collectionId, nftId }: Params): Promise<LoanTerms> {
  logger.info(`Fetching loan terms for NFT ID <${nftId}> and collection ID <${collectionId}> on blockchain <${JSON.stringify(blockchain)}>...`)

  switch (blockchain.network) {
  case 'ethereum': {
    const collection = await findOneCollection({ id: collectionId, blockchain })
    if (!collection) throw failure('UNSUPPORTED_COLLECTION')

    const pool = await findOnePool({ collectionAddress: collection.address, blockchain })
    if (!pool) throw failure('NO_POOLS_AVAILABLE')

    const nft: NFT = {
      collection,
      id: nftId,
      ...await getNFTMetadata({ blockchain, collectionAddress: collection.address, nftId }),
    }

    const contract = await getPoolContract({ blockchain, poolAddress: pool.address })

    const valuation = await getEthCollectionValuation({ blockchain: blockchain as Blockchain<'ethereum'>, collectionAddress: collection.address })
    const { signature, issuedAtBlock, expiresAtBlock } = await signValuation({ blockchain, nftId, collectionAddress: collection.address, poolAddress: pool.address, valuation })

    const loanTerms: LoanTerms = {
      // TODO: remove hack!
      routerAddress: contract.poolVersion === 2 ? routerAddresses(Number(blockchain.networkId), pool.address) : undefined,
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
      option.maxBorrow = $ETH(option.maxLTVBPS.div(10_000).times(loanTerms.valuation.value?.amount ?? 0))
    })

    logger.info(`Fetching loan terms for NFT ID <${nftId}> and collection ID <${collectionId}> on blockchain <${JSON.stringify(blockchain)}>... OK`, loanTerms)

    return loanTerms
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
