import BigNumber from 'bignumber.js'
import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, Value } from '../../entities'
import Loan from '../../entities/lib/Loan'
import { getOnChainLoanById } from '../../subgraph'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import { getNFTMetadata } from '../collaterals'
import { getCollection } from '../collections'
import { getControlPlaneContract, getPoolContract } from '../contracts'
import { searchPools } from '../pools'
import { getEthBlockNumber } from '../utils/ethereum'
import { getEthCollectionValuation } from '../valuations'

type Params = {
  blockchain: Blockchain
  collectionAddress: string
  nftId: string
  txSpeedBlocks?: number
}

export default async function getLoan({
  blockchain,
  collectionAddress,
  nftId,
  txSpeedBlocks = 0,
}: Params): Promise<Loan | undefined> {
  logger.info(`Fetching loan position for collection address <${collectionAddress}>, NFT ID <${nftId}>, txSpeedBlocks <${txSpeedBlocks}> and blockchain <${JSON.stringify(blockchain)}>...`)

  try {
    switch (blockchain.network) {
    case 'ethereum': {
      const loanId = `${collectionAddress.toLowerCase()}/${nftId}`
      const { loan: loanValues } = await getOnChainLoanById({ loanId }, { networkId: blockchain.networkId })

      const collection = await getCollection({ address: collectionAddress, blockchain, nftId })
      if (!collection) throw fault('ERR_UNSUPPORTED_COLLECTION')

      const [blockNumber, pools, valuation] = await Promise.all([
        getEthBlockNumber(blockchain.networkId),
        searchPools({ collectionAddress, blockchainFilter: { ethereum: blockchain.networkId }, includeRetired: true }),
        getEthCollectionValuation({ blockchain: blockchain as Blockchain<'ethereum'>, collectionAddress: collection.address, tokenId: nftId }),
      ])

      if (pools.length === 0) throw fault('ERR_UNSUPPORTED_COLLECTION')

      const loan = pools.reduce<Promise<Loan | undefined>>(async (l, pool) => {
        const rL = await l
        if (rL) return rL
        const contract = await getPoolContract({ blockchain, poolAddress: pool.address })
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
          accuredInterest: Value.$WEI(loanValues.accuredInterestWei),
          borrowed: Value.$WEI(loanValues.borrowedWei),
          borrowerAddress: loanValues.borrower,
          expiresAt: new Date(_.toNumber(loanValues.loanExpiretimestamp) * 1000),
          interestBPSPerBlock: new BigNumber(loanValues.interestBPS1000000XBlock).dividedBy(new BigNumber(1_000_000)),
          loanStartBlock: loanValues.loanStartBlock,
          maxLTVBPS: new BigNumber(loanValues.maxLTVBPS),
          nft,
          outstanding: Value.$WEI(outstandingWithInterestWei),
          poolAddress: pool.address,
          repaidInterest: Value.$WEI(loanValues.repaidInterestWei),
          returned: Value.$WEI(loanValues.returnedWei),
          valuation,
          updatedAtBlock: blockNumber,
        }
      }, new Promise(resolve => resolve(undefined)))

      logger.info(`Fetching loan position for collection address <${collectionAddress}>, NFT ID <${nftId}>, txSpeedBlocks <${txSpeedBlocks}> and blockchain <${JSON.stringify(blockchain)}>... OK:`, loan)

      return loan
    }
    default:
      throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    }
  }
  catch (err) {
    logger.error(`Fetching loan position for collection address <${collectionAddress}>, NFT ID <${nftId}>, txSpeedBlocks <${txSpeedBlocks}> and blockchain <${JSON.stringify(blockchain)}>... ERR:`, err)
    throw err
  }
}
