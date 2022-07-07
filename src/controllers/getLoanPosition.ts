import BigNumber from 'bignumber.js'
import _ from 'lodash'
import appConf from '../app.conf'
import { findAllPools, findOneCollection } from '../db'
import { Blockchain, LoanPosition, Value } from '../entities'
import { getEthBlockNumber } from '../utils/ethereum'
import fault from '../utils/fault'
import logger from '../utils/logger'
import { getNFTMetadata } from './collaterals'
import { getControlPlaneContract, getPoolContract } from './contracts'
import getEthCollectionValuation from './getEthCollectionValuation'
import getLoanEvent from './getLoanEvent'

type Params = {
  blockchain: Blockchain
  collectionId: string
  nftId: string
  txSpeedBlocks: number
}

export default async function getLoanPosition({ blockchain, collectionId, nftId, txSpeedBlocks }: Params): Promise<LoanPosition | undefined> {
  logger.info(`Fetching loan position for collection ID <${collectionId}>, NFT ID <${nftId}>, txSpeedBlocks <${txSpeedBlocks}> and blockchain <${JSON.stringify(blockchain)}>...`)

  try {
    switch (blockchain.network) {
    case 'ethereum': {
      const collection = await findOneCollection({ id: collectionId, blockchain })
      if (!collection) throw fault('ERR_UNSUPPORTED_COLLECTION')

      const [blockNumber, pools, valuation] = await Promise.all([
        getEthBlockNumber(blockchain.networkId),
        findAllPools({ collectionId, blockchainFilter: { ethereum: blockchain.networkId }, includeRetired: true }),
        getEthCollectionValuation({ blockchain: blockchain as Blockchain<'ethereum'>, collectionAddress: collection.address }),
      ])

      if (pools.length === 0) throw fault('ERR_UNSUPPORTED_COLLECTION')

      const loanPosition = pools.reduce<Promise<LoanPosition | undefined>>(async (loan, pool) => {
        const rLoan = await loan
        if (rLoan) return rLoan
        const contract = await getPoolContract({ blockchain, poolAddress: pool.address })
        const event = await getLoanEvent({ blockchain, nftId, poolAddress: pool.address })
        const loanDetails = await contract.methods._loans(nftId).call()
        const controlPlaneContract = getControlPlaneContract({ blockchain, address: _.get(appConf.controlPlaneContractAddress, blockchain.networkId) })
        const outstandingWithInterestWei = new BigNumber(await controlPlaneContract.methods.outstanding(loanDetails, txSpeedBlocks).call())

        // Early exit if loan is fully repaid.
        if (outstandingWithInterestWei.lte(new BigNumber(0))) return undefined

        const nft = {
          collection,
          id: nftId,
          ownerAddress: pool.address,
          ...await getNFTMetadata({ blockchain, collectionAddress: collection.address, nftId }),
          isSupported: true,
        }

        return {
          routerAddress: pool.repayRouterAddress,
          accuredInterest: Value.$WEI(event.accuredInterestWei),
          borrowed: Value.$WEI(event.borrowedWei),
          borrowerAddress: event.borrower,
          expiresAt: new Date(_.toNumber(event.loanExpireTimestamp) * 1000),
          interestBPSPerBlock: new BigNumber(event.interestBPS1000000XBlock).dividedBy(new BigNumber(1_000_000)),
          loanStartBlock: event.loanStartBlock,
          maxLTVBPS: new BigNumber(event.maxLTVBPS),
          nft,
          outstanding: Value.$WEI(outstandingWithInterestWei),
          poolAddress: pool.address,
          repaidInterest: Value.$WEI(event.repaidInterestWei),
          returned: Value.$WEI(event.returnedWei),
          valuation,
          updatedAtBlock: blockNumber,
        }
      }, new Promise(resolve => resolve(undefined)))

      logger.info(`Fetching loan position for collection ID <${collectionId}>, NFT ID <${nftId}>, txSpeedBlocks <${txSpeedBlocks}> and blockchain <${JSON.stringify(blockchain)}>... OK:`, loanPosition)

      return loanPosition
    }
    default:
      throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    }
  }
  catch (err) {
    logger.error(`Fetching loan position for collection ID <${collectionId}>, NFT ID <${nftId}>, txSpeedBlocks <${txSpeedBlocks}> and blockchain <${JSON.stringify(blockchain)}>... ERR:`, err)
    throw err
  }
}
