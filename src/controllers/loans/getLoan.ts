import BigNumber from 'bignumber.js'
import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, Collection, Value } from '../../entities'
import Loan from '../../entities/lib/Loan'
import { getOnChainLoanById } from '../../subgraph'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import { getEthNFTMetadata } from '../collaterals'
import { getEthCollectionMetadata } from '../collections'
import { getControlPlaneContract, getPoolContract } from '../contracts'
import { getPool, searchPublishedPools } from '../pools'
import getEthWeb3 from '../utils/getEthWeb3'

type Params = {
  blockchain: Blockchain
  collectionAddress: string
  nftId: string
  populateValuation?: boolean
  txSpeedBlocks?: number
}

export default async function getLoan({
  blockchain,
  collectionAddress,
  nftId,
  populateValuation = false,
  txSpeedBlocks = 2000,
}: Params): Promise<Loan | undefined> {
  logger.info(`Fetching loan for collection address <${collectionAddress}>, NFT ID <${nftId}>, txSpeedBlocks <${txSpeedBlocks}> and blockchain <${JSON.stringify(blockchain)}>...`)

  try {
    switch (blockchain.network) {
    case 'ethereum':
    case 'polygon': {
      const loanId = `${collectionAddress}/${nftId}`
      const onChainLoan = await getOnChainLoanById({ loanId }, { networkId: blockchain.networkId })

      const web3 = getEthWeb3(blockchain.networkId)

      const [blockNumber, pools] = await Promise.all([
        web3.eth.getBlockNumber(),
        searchPublishedPools({ address: onChainLoan.pool, blockchainFilter: Blockchain.parseFilter(blockchain), includeRetired: true }),
      ])
      // Special case. If pool is unpublished. We cannot find the pool in the database anymore.
      if (pools.length === 0) {
        const nft = {
          collection: Collection.factory({
            address: collectionAddress,
            blockchain,
            ...await getEthCollectionMetadata({ blockchain, collectionAddress, matchSubcollectionBy: { type: 'nftId', value: nftId } }),
          }),
          id: nftId,
          ownerAddress: onChainLoan.pool,
          ...await getEthNFTMetadata({ blockchain, collectionAddress, nftId }),
        }
        const newPool = await getPool({ collectionAddress, blockchain, nft: { id: nftId, name: nft.name } })
        const contract = await getPoolContract({ blockchain, poolAddress: onChainLoan.pool })
        const loanDetails = await contract.methods._loans(nftId).call()
        loanDetails.interestBPS1000000XBlock = ((Math.log10(10000 + Number(loanDetails.interestBPS1000000XBlock.toString()) * 2628000 / 1000000) + 200 + Number(loanDetails.interestBPS1000000XBlock.toString()) * 2628000 / 1000000) * 1000000 / 2628000).toFixed(0)
        const controlPlaneContract = getControlPlaneContract({ blockchain, address: _.get(appConf.controlPlaneContractAddress, blockchain.networkId) })
        const outstandingWithInterestWei = new BigNumber(await controlPlaneContract.methods.outstanding(loanDetails, txSpeedBlocks).call()).plus('10000000000000000')

        if (outstandingWithInterestWei.lte(new BigNumber(0))) return undefined

        return Loan.factory({
          routerAddress: '0x1C120cE3853542C0Fe3B75AF8F4c7F223f957d51',
          accuredInterest: Value.$WEI(onChainLoan.accuredInterestWei),
          borrowed: Value.$WEI(onChainLoan.borrowedWei),
          borrowerAddress: onChainLoan.borrower,
          expiresAt: new Date(_.toNumber(onChainLoan.loanExpiretimestamp) * 1000),
          interestBPSPerBlock: new BigNumber(onChainLoan.interestBPS1000000XBlock).dividedBy(new BigNumber(1_000_000)),
          loanStartBlock: onChainLoan.loanStartBlock,
          maxLTVBPS: new BigNumber(onChainLoan.maxLTVBPS),
          nft,
          outstanding: Value.$WEI(outstandingWithInterestWei),
          poolAddress: onChainLoan.pool,
          repaidInterest: Value.$WEI(onChainLoan.repaidInterestWei),
          returned: Value.$WEI(onChainLoan.returnedWei),
          valuation: newPool ? newPool.collection?.valuation : undefined,
          updatedAtBlock: blockNumber,
        })
      }

      const loan = pools.reduce<Promise<Loan | undefined>>(async (l, pool) => {
        const rL = await l
        if (rL) return rL

        // if (pool.collection.valuation && (pool.collection.valuation?.timestamp || 0) < new Date().getTime() - appConf.valuationLimitation) {
        //   throw fault('INVALID_VALUATION_TIMESTAMP')
        // }

        const contract = await getPoolContract({ blockchain, poolAddress: pool.address })
        const loanDetails = await contract.methods._loans(nftId).call()
        loanDetails.interestBPS1000000XBlock = ((Math.log10(10000 + Number(loanDetails.interestBPS1000000XBlock.toString()) * 2628000 / 1000000) + 200 + Number(loanDetails.interestBPS1000000XBlock.toString()) * 2628000 / 1000000) * 1000000 / 2628000).toFixed(0)
        const controlPlaneContract = getControlPlaneContract({ blockchain, address: _.get(appConf.controlPlaneContractAddress, blockchain.networkId) })
        const outstandingWithInterestWei = new BigNumber(await controlPlaneContract.methods.outstanding(loanDetails, txSpeedBlocks).call()).multipliedBy('1.01')

        // Early exit if loan is fully repaid.
        if (outstandingWithInterestWei.lte(new BigNumber(0))) return undefined

        const nft = {
          collection: Collection.factory({
            address: collectionAddress,
            blockchain,
            ...await getEthCollectionMetadata({ blockchain, collectionAddress, matchSubcollectionBy: { type: 'poolAddress', value: pool.address } }),
          }),
          id: nftId,
          ownerAddress: pool.address,
          ...await getEthNFTMetadata({ blockchain, collectionAddress, nftId }),
        }

        return Loan.factory({
          routerAddress: pool.repayRouterAddress,
          accuredInterest: Value.$WEI(onChainLoan.accuredInterestWei),
          borrowed: Value.$WEI(onChainLoan.borrowedWei),
          borrowerAddress: onChainLoan.borrower,
          expiresAt: new Date(_.toNumber(onChainLoan.loanExpiretimestamp) * 1000),
          interestBPSPerBlock: new BigNumber(onChainLoan.interestBPS1000000XBlock).dividedBy(new BigNumber(1_000_000)),
          loanStartBlock: onChainLoan.loanStartBlock,
          maxLTVBPS: new BigNumber(onChainLoan.maxLTVBPS),
          nft,
          outstanding: Value.$WEI(outstandingWithInterestWei),
          poolAddress: pool.address,
          repaidInterest: Value.$WEI(onChainLoan.repaidInterestWei),
          returned: Value.$WEI(onChainLoan.returnedWei),
          valuation: populateValuation === true ? pool.collection.valuation : undefined,
          updatedAtBlock: blockNumber,
        })
      }, new Promise(resolve => resolve(undefined)))

      logger.info(`Fetching loan for collection address <${collectionAddress}>, NFT ID <${nftId}>, txSpeedBlocks <${txSpeedBlocks}> and blockchain <${JSON.stringify(blockchain)}>... OK:`, loan)

      return loan
    }
    default:
      throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    }
  }
  catch (err) {
    logger.error(`Fetching loan for collection address <${collectionAddress}>, NFT ID <${nftId}>, txSpeedBlocks <${txSpeedBlocks}> and blockchain <${JSON.stringify(blockchain)}>... ERR:`, err)
    throw err
  }
}
