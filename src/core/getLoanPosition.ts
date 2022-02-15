import BigNumber from 'bignumber.js'
import _ from 'lodash'
import { findOne as findOneCollection } from '../db/collections'
import { findOne as findOnePool } from '../db/pools'
import Blockchain from '../entities/lib/Blockchain'
import LoanPosition from '../entities/lib/LoanPosition'
import { $WEI } from '../entities/lib/Value'
import { getEthBlockNumber } from '../utils/ethereum'
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
    const [blockNumber, collection, pool, valuation] = await Promise.all([
      getEthBlockNumber(blockchain.networkId),
      findOneCollection({ id: collectionId, blockchain }),
      findOnePool({ collectionId, blockchain }),
      getCollectionValuation({ blockchain, collectionId }),
    ])

    if (!collection || !pool) throw failure('UNSUPPORTED_COLLECTION')

    const contract = getPoolContract({ blockchain, poolAddress: pool.address })
    const event = await getLoanEvent({ blockchain, nftId, poolAddress: pool.address })
    const outstandingWei = new BigNumber(await contract.methods.outstanding(nftId).call())

    // Early exit if loan is fully repaid.
    if (outstandingWei.lte(new BigNumber(0))) return undefined

    // Give X blocks time for the loan to repay, extra ETH will be returned to user.
    const interestRate = new BigNumber(event.interestBPS1000000XBlock).div(new BigNumber(10_000_000_000)).times(new BigNumber(txSpeedBlocks))
    const interestWei = outstandingWei.times(interestRate).dp(0)
    const outstandingWithInterestWei = new BigNumber(outstandingWei.plus(interestWei).toFixed().replace(/.{0,13}$/, '') + '0000000000000').plus(new BigNumber('10000000000000'))

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
