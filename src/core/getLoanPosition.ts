import BigNumber from 'bignumber.js'
import _ from 'lodash'
import { repayRouterAddresses } from '../config/supportedCollections'
import { findOne as findOneCollection } from '../db/collections'
import { findAll as findAllPools } from '../db/pools'
import Blockchain from '../entities/lib/Blockchain'
import LoanPosition from '../entities/lib/LoanPosition'
import { $WEI } from '../entities/lib/Value'
import { getEthBlockNumber } from '../utils/ethereum'
import failure from '../utils/failure'
import logger from '../utils/logger'
import getControlPlaneContract from './getControlPlaneContract'
import getEthCollectionValuation from './getEthCollectionValuation'
import getLoanEvent from './getLoanEvent'
import getNFTMetadata from './getNFTMetadata'
import getPoolContract from './getPoolContract'

type Params = {
  blockchain: Blockchain
  collectionId: string
  nftId: string
  txSpeedBlocks: number
}

const controlPlaneContractAddresses: { [key: number]: any } = {
  4: '0x5E282F68a7CD593609C05AbCA32482395968d885',
  1: '0x9C2780F9e427E29Ba77EDC34C3F42e0865C3FBDF',
}

export default async function getLoanPosition({ blockchain, collectionId, nftId, txSpeedBlocks }: Params): Promise<LoanPosition | undefined> {
  logger.info(`Fetching loan position for collection ID <${collectionId}>, NFT ID <${nftId}>, txSpeedBlocks <${txSpeedBlocks}> and blockchain <${JSON.stringify(blockchain)}>...`)

  switch (blockchain.network) {
  case 'ethereum': {
    const collection = await findOneCollection({ id: collectionId, blockchain })
    if (!collection) throw failure('UNSUPPORTED_COLLECTION')

    const [blockNumber, pools, valuation] = await Promise.all([
      getEthBlockNumber(blockchain.networkId),
      findAllPools({ collectionId, blockchains: { ethereum: blockchain.network }, retired: true }),
      getEthCollectionValuation({ blockchain: blockchain as Blockchain<'ethereum'>, collectionAddress: collection.address }),
    ])

    if (pools.length === 0) throw failure('UNSUPPORTED_COLLECTION')

    const loanPosition = pools.reduce<Promise<LoanPosition | undefined>>(async (loan, pool) => {
      if (loan) return loan
      const contract = await getPoolContract({ blockchain, poolAddress: pool.address })
      const event = await getLoanEvent({ blockchain, nftId, poolAddress: pool.address })
      const loanDetails = await contract.methods._loans(nftId).call()
      const controlPlaneContract = getControlPlaneContract({ blockchain, address: controlPlaneContractAddresses[Number(blockchain.networkId)] })
      const outstandingWithInterestWei = new BigNumber(await controlPlaneContract.methods.outstanding(loanDetails, txSpeedBlocks).call())

      // Early exit if loan is fully repaid.
      if (outstandingWithInterestWei.lte(new BigNumber(0))) return undefined

      const nft = {
        collection,
        id: nftId,
        ownerAddress: pool.address,
        ...await getNFTMetadata({ blockchain, collectionAddress: collection.address, nftId }),
      }

      return {
        // TODO: remove hack!
        routerAddress: contract.poolVersion === 2 ? repayRouterAddresses(Number(blockchain.networkId), pool.address) : undefined,
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
    }, new Promise(resolve => resolve(undefined)))

    logger.info(`Fetching loan position for collection ID <${collectionId}>, NFT ID <${nftId}>, txSpeedBlocks <${txSpeedBlocks}> and blockchain <${JSON.stringify(blockchain)}>... OK: ${JSON.stringify(loanPosition)}`)

    return loanPosition
  }
  default:
    logger.info(`Fetching loan position for collection ID <${collectionId}>, NFT ID <${nftId}>, txSpeedBlocks <${txSpeedBlocks}> and blockchain <${JSON.stringify(blockchain)}>... ERR: Unsupported blockchain`)

    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
