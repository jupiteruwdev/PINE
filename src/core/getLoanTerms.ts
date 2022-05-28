import axios from 'axios'
import { rolloverAddresses, routerAddresses } from '../config/supportedCollections'
import { findOne as findOneCollection } from '../db/collections'
import { findOne as findOnePool } from '../db/pools'
import Blockchain from '../entities/lib/Blockchain'
import LoanTerms from '../entities/lib/LoanTerms'
import NFT from '../entities/lib/NFT'
import RolloverTerms from '../entities/lib/RolloverTerms'
import { $ETH } from '../entities/lib/Value'
import failure from '../utils/failure'
import logger from '../utils/logger'
import getEthCollectionValuation from './getEthCollectionValuation'
import getFlashLoanSource from './getFlashLoanSource'
import getNFTMetadata from './getNFTMetadata'
import getPoolContract from './getPoolContract'
import signValuation from './signValuation'

type Params = {
  blockchain: Blockchain
  collectionId: string
  nftId: string
}

const APIURL = 'https://api.thegraph.com/subgraphs/name/pinedefi/open-loans'

const tokensQuery = (collectionAddress: string, nftId: string) => (
  {
    operationName: 'openLoans',
    query: `query {
      loans(where: {id: "${collectionAddress}/${nftId}"}) {
        borrowedWei
        returnedWei
        pool
      }
    }`,
    variables: {},
  }
)

export default async function getLoanTerms({ blockchain, collectionId, nftId }: Params): Promise<LoanTerms | RolloverTerms> {
  logger.info(`Fetching loan terms for NFT ID <${nftId}> and collection ID <${collectionId}> on blockchain <${JSON.stringify(blockchain)}>...`)

  switch (blockchain.network) {
  case 'ethereum': {
    const collection = await findOneCollection({ id: collectionId, blockchain })
    if (!collection) throw failure('UNSUPPORTED_COLLECTION')

    const { data: { data: { loans } } } = await axios.post(APIURL, tokensQuery(collection.address, nftId))
    const existingLoan = loans.length > 0 ? loans[0] : undefined

    const hasLoan: boolean = Number(existingLoan?.borrowedWei) > Number(existingLoan?.returnedWei)

    let pool
    let flashLoanSource

    if (hasLoan) {
      pool = await findOnePool({ address: existingLoan?.pool, blockchain })
      flashLoanSource = await getFlashLoanSource({ blockchain, poolAddress: existingLoan?.pool })
      if (!pool) throw failure('NO_POOLS_AVAILABLE')
    }
    else {
      pool = await findOnePool({ collectionAddress: collection.address, blockchain })
      if (!pool) throw failure('NO_POOLS_AVAILABLE')
    }

    const nft: NFT = {
      collection,
      id: nftId,
      ...await getNFTMetadata({ blockchain, collectionAddress: collection.address, nftId }),
    }

    const contract = await getPoolContract({ blockchain, poolAddress: pool.address })

    const valuation = await getEthCollectionValuation({ blockchain: blockchain as Blockchain<'ethereum'>, collectionAddress: collection.address })
    const { signature, issuedAtBlock, expiresAtBlock } = await signValuation({ blockchain, nftId, collectionAddress: collection.address, poolAddress: pool.address, valuation })

    const loanTerms: LoanTerms | RolloverTerms = {
      // TODO: remove hack!
      routerAddress: contract.poolVersion === 2 ? hasLoan ? rolloverAddresses[Number(blockchain.networkId)] : routerAddresses[Number(blockchain.networkId)] : undefined,
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
      option.maxBorrow = $ETH(option.maxLTVBPS.div(10_000).times(loanTerms.valuation.value?.amount ?? 0))
    })

    logger.info(`Fetching loan terms for NFT ID <${nftId}> and collection ID <${collectionId}> on blockchain <${JSON.stringify(blockchain)}>... OK`, loanTerms)

    return loanTerms
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
