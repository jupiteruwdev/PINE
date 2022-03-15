import BigNumber from 'bignumber.js'
import _ from 'lodash'
import { routerAddresses } from '../config/supportedCollections'
import { findOne as findOneCollection } from '../db/collections'
import { findOne as findOnePool } from '../db/pools'
import Blockchain, { EthBlockchain } from '../entities/lib/Blockchain'
import LoanPosition from '../entities/lib/LoanPosition'
import { $WEI } from '../entities/lib/Value'
import { getEthBlockNumber } from '../utils/ethereum'
import failure from '../utils/failure'
import logger from '../utils/logger'
import getCollectionValuation from './getCollectionValuation'
import getControlPlaneContract from './getControlPlaneContract'
import getLoanEvent from './getLoanEvent'
import getNFTMetadata from './getNFTMetadata'
import getPoolContract from './getPoolContract'

type Params = {
  blockchain: Blockchain
  collectionId: string
  nftId: string
  txSpeedBlocks: number
}

export default async function getLoanPosition({ blockchain, collectionId, nftId, txSpeedBlocks }: Params): Promise<LoanPosition | undefined> {
  logger.info(`Fetching loan position for collection ID <${collectionId}>, NFT ID <${nftId}>, txSpeedBlocks <${txSpeedBlocks}> and blockchain <${JSON.stringify(blockchain)}>...`)

  switch (blockchain.network) {
  case 'ethereum': {
    const [blockNumber, collection, pool, valuation] = await Promise.all([
      getEthBlockNumber(blockchain.networkId),
      findOneCollection({ id: collectionId, blockchain }),
      findOnePool({ collectionId, blockchain }),
      getCollectionValuation({ blockchain, collectionId }),
    ])

    if (!collection || !pool) throw failure('UNSUPPORTED_COLLECTION')
    logger.info('Getting Loan Events...')
    const contract = await getPoolContract({ blockchain, poolAddress: pool.address })
    const event = await getLoanEvent({ blockchain, nftId, poolAddress: pool.address })
    logger.info('Getting Loan Events... OK')
    const loanDetails = await contract.methods._loans(nftId).call()
    const controlPlaneContract = getControlPlaneContract({ blockchain: EthBlockchain(4), address: '0xB37EBE58D65bcC4fA5665F5483ab3449490015c7sw' })
    const outstandingWithInterestWei = new BigNumber(await controlPlaneContract.methods.outstanding(loanDetails, txSpeedBlocks).call())
    // Early exit if loan is fully repaid.
    if (outstandingWithInterestWei.lte(new BigNumber(0))) return undefined

    const nft = {
      collection,
      id: nftId,
      ownerAddress: pool.address,
      ...await getNFTMetadata({ blockchain, collectionAddress: collection.address, nftId }),
    }

    const loanPosition: LoanPosition = {
      routerAddress: contract.poolVersion === 2 ? routerAddresses[Number(blockchain.networkId)] : undefined,
      accuredInterest: $WEI(event.accuredInterestWei),
      borrowed: $WEI(event.borrowedWei),
      borrowerAddress: event.borrower,
      expiresAt: new Date(_.toNumber(event.loanExpireTimestamp) * 1000),
      interestBPSPerBlock: new BigNumber(event.interestBPS1000000XBlock).dividedBy(new BigNumber(1_000_000)),
      loanStartBlock: event.loanStartBlock,
      maxLTVBPS: new BigNumber(event.maxLTVBPS),
      nft,
      outstanding: $WEI(outstandingWithInterestWei),
      poolAddress: pool.address,
      repaidInterest: $WEI(event.repaidInterestWei),
      returned: $WEI(event.returnedWei),
      valuation,
      updatedAtBlock: blockNumber,
    }

    return loanPosition
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
