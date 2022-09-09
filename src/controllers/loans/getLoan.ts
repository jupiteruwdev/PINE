import BigNumber from 'bignumber.js'
import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, Collection, Pool, Value } from '../../entities'
import Loan from '../../entities/lib/Loan'
import { getOnChainLoanById } from '../../subgraph'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import { getEthNFTMetadata } from '../collaterals'
import { getEthCollectionMetadata } from '../collections'
import { getControlPlaneContract, getPoolContract } from '../contracts'
import { searchPublishedPools } from '../pools'
import getEthWeb3 from '../utils/getEthWeb3'
import { getEthNFTValuation } from '../valuations'

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
  txSpeedBlocks = 0,
}: Params): Promise<Loan | undefined> {
  logger.info(`Fetching loan for collection address <${collectionAddress}>, NFT ID <${nftId}>, txSpeedBlocks <${txSpeedBlocks}> and blockchain <${JSON.stringify(blockchain)}>...`)

  try {
    switch (blockchain.network) {
    case 'ethereum': {
      const loanId = `${collectionAddress}/${nftId}`
      const onChainLoan = await getOnChainLoanById({ loanId }, { networkId: blockchain.networkId })

      const web3 = getEthWeb3(blockchain.networkId)

      const [blockNumber, poolGroups, valuation] = await Promise.all([
        web3.eth.getBlockNumber(),
        searchPublishedPools({ address: onChainLoan.pool, blockchainFilter: { ethereum: blockchain.networkId }, includeRetired: true }),
        populateValuation === true
          ? getEthNFTValuation({ blockchain: blockchain as Blockchain<'ethereum'>, collectionAddress, nftId })
          : undefined,
      ])

      if (poolGroups.length === 0) throw fault('ERR_UNSUPPORTED_COLLECTION')
      const pools = poolGroups as Pool[]

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
          collection: Collection.factory({
            address: collectionAddress,
            blockchain,
            ...await getEthCollectionMetadata({ blockchain, collectionAddress, matchSubcollectionBy: { type: 'poolAddress', value: pool.address } }),
          }),
          id: nftId,
          ownerAddress: pool.address,
          ...await getEthNFTMetadata({ blockchain, collectionAddress, nftId }),
          isSupported: true,
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
          valuation,
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
