import BN from 'bn.js'
import _ from 'lodash'
import { findOne as findOneCollection } from '../db/collections'
import { findOne as findOnePool } from '../db/pools'
import Blockchain from '../entities/Blockchain'
import LoanPosition from '../entities/LoanPosition'
import { $WEI } from '../entities/Value'
import failure from '../utils/failure'
import logger from '../utils/logger'
import getCollectionValuation from './getCollectionValuation'
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
    const [collection, pool, valuation] = await Promise.all([
      findOneCollection({ id: collectionId, blockchain }),
      findOnePool({ collectionId, blockchain }),
      getCollectionValuation({ blockchain, collectionId }),
    ])

    if (!collection || !pool) throw failure('UNSUPPORTED_COLLECTION')

    const contract = getPoolContract({ blockchain, poolAddress: pool.address })
    const event = await getLoanEvent({ blockchain, nftId, poolAddress: pool.address })
    const outstandingWei = new BN(await contract.methods.outstanding(nftId).call())

    // Early exit if loan is fully repaid.
    if (outstandingWei.lte(new BN(0))) return undefined

    // Give X blocks time for the loan to repay, extra ETH will be returned to user.
    const interestRate = new BN(event.interestBPS1000000XBlock).div(new BN(10_000_000_000)).mul(new BN(txSpeedBlocks))
    const interestWei = outstandingWei.mul(interestRate)
    const outstandingWithInterestWei = outstandingWei.add(interestWei)

    const nft = {
      collection,
      id: nftId,
      ownerAddress: pool.address,
      ...await getNFTMetadata({ blockchain, collectionAddress: collection.address, nftId }),
    }

    const loanPosition: LoanPosition = {
      accuredInterest: $WEI(event.accuredInterestWei),
      borrowed: $WEI(event.borrowedWei),
      borrowerAddress: event.borrower,
      expiresAt: event.loanExpireTimestamp,
      interestBPSPerBlock: _.toNumber(event.interestBPS1000000XBlock) / 1_000_000,
      loanStartBlock: event.loanStartBlock,
      maxLTVBPS: _.toNumber(event.maxLTVBPS),
      nft,
      outstanding: $WEI(new BN(outstandingWithInterestWei.toString().replace(/.{0,13}$/, '') + '0000000000000').add(new BN('10000000000000')).toNumber()),
      poolAddress: pool.address,
      repaidInterest: $WEI(event.repaidInterestWei),
      returned: $WEI(event.returnedWei),
      valuation,
    }

    return loanPosition
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}