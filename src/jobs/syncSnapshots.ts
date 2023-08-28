import BigNumber from 'bignumber.js'
import _ from 'lodash'
import { getCollectionValuation } from '../controllers'
import getEthWeb3 from '../controllers/utils/getEthWeb3'
import { BorrowSnapshotModel, LendingSnapshotModel, PoolModel, initDb } from '../database'
import { Blockchain } from '../entities'
import { getOnChainLoans, getOnChainPools } from '../subgraph'
import fault from '../utils/fault'
import logger from '../utils/logger'
import sleep from '../utils/sleep'

async function syncBorrowSnapshot(blockchain: Blockchain) {
  try {
    logger.info('JOB_SYNC_SNAPSHOTS sync borrow snapshot')
    const loans = await getOnChainLoans({}, { networkId: blockchain.networkId })
    const web3 = getEthWeb3(Blockchain.Polygon.Network.MAIN)
    const blockNumber = await web3.eth.getBlockNumber()
    const borrowSnapshots = []

    for (const loan of loans) {
      try {
        const floorPrice = await getCollectionValuation({
          blockchain,
          collectionAddress: _.get(loan, 'erc721'),
          nftId: _.get(loan, 'id').split('/')[1],
        })

        borrowSnapshots.push({
          borrowerAddress: _.get(loan, 'borrower'),
          borrowAmount: _.get(loan, 'borrowedWei'),
          lenderAddress: _.get(loan, 'lenderAddress'),
          collectionAddress: _.get(loan, 'erc721'),
          nftId: _.get(loan, 'id').split('/')[1],
          collateralPrice: {
            amount: (floorPrice.value?.amount || new BigNumber(0)).toString(),
            currency: floorPrice.value?.currency,
          },
          networkId: blockchain.networkId,
          networkType: blockchain.network,
          blockNumber,
        })

        await sleep(1000)
      }
      catch (err) {
        logger.error(`JOB_SYNC_SNAPSHOTS sync borrow snapshot for loan ${_.get(loan, 'id')} error`, err)
      }
    }

    await BorrowSnapshotModel.insertMany(borrowSnapshots)
    logger.info(`JOB_SYNC_SNAPSHOTS sync ${loans.length} borrow snapshots... OK`)
  }
  catch (err) {
    logger.error('JOB_SYNC_SNAPSHOTS sync borrow snapshot... ERR:', err)
  }
}

async function syncLendingSnapshot(blockchain: Blockchain) {
  try {
    logger.info('JOB_SYNC_SNAPSHOTS sync lending snapshot')
    const { pools } = await getOnChainPools({}, { networkId: blockchain.networkId })
    const availablePools = await PoolModel.find({ retired: false, networkId: blockchain.networkId }).lean()
    const web3 = getEthWeb3(Blockchain.Polygon.Network.MAIN)
    const blockNumber = await web3.eth.getBlockNumber()
    const lendingSnapshots = []
    let count = 0

    for (const pool of availablePools) {
      const onChainPool = pools.find((p: any) => _.get(p, 'id', '') === pool.address?.toLowerCase())

      if (onChainPool) {
        lendingSnapshots.push({
          lenderAddress: _.get(onChainPool, 'lenderAddress'),
          collectionAddress: _.get(onChainPool, 'collection'),
          fundSource: _.get(onChainPool, 'fundSource'),
          capacity: _.min([parseFloat(pool.ethLimit?.toString() ?? '0'), parseFloat(pool.valueLockedEth?.toString() ?? '0')]),
          networkId: blockchain.networkId,
          networkType: blockchain.network,
          blockNumber,
        })
        count++
      }
    }

    await LendingSnapshotModel.insertMany(lendingSnapshots)
    logger.info(`JOB_SYNC_SNAPSHOTS sync ${count} lending snapshots... OK`)
  }
  catch (err) {
    logger.error('JOB_SYNC_SNAPSHOTS sync lending snapshot... ERR:', err)
  }
}

export default async function syncSnapshots() {
  try {
    await initDb({
      onError: err => {
        logger.error('Establishing database conection... ERR:', err)
        throw fault('ERR_DB_CONNECTION', undefined, err)
      },
      onOpen: () => {
        logger.info('Establishing database connection... OK')
      },
    })
    await syncBorrowSnapshot(Blockchain.Ethereum())
    await syncLendingSnapshot(Blockchain.Ethereum())

    await syncBorrowSnapshot(Blockchain.Polygon())
    await syncLendingSnapshot(Blockchain.Polygon())
  }
  catch (err) {
    logger.error('JOB_SYNC_SNAPSHOTS Handling runtime error... ERR:', err)
    process.exit(1)
  }
}

syncSnapshots()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1) // Retry Job Task by exiting the process
  })
