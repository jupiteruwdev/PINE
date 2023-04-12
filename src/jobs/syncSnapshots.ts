import BigNumber from 'bignumber.js'
import { NextFunction, Request, Response } from 'express'
import _ from 'lodash'
import { getEthNFTValuation } from '../controllers'
import getEthWeb3 from '../controllers/utils/getEthWeb3'
import { BorrowSnapshotModel, LendingSnapshotModel, PoolModel } from '../db'
import { Blockchain } from '../entities'
import { getOnChainLoans, getOnChainPools } from '../subgraph'
import logger from '../utils/logger'
import sleep from '../utils/sleep'

async function syncBorrowSnapshot(blockchain: Blockchain) {
  try {
    logger.info('JOB_SYNC_SNAPSHOTS sync borrow snapshot')
    const loans = await getOnChainLoans({}, { networkId: blockchain.networkId })
    const web3 = getEthWeb3(Blockchain.Polygon.Network.MAIN)
    const blockNumber = await web3.eth.getBlockNumber()

    for (const loan of loans) {
      const floorPrice = await getEthNFTValuation({
        blockchain,
        collectionAddress: _.get(loan, 'erc721'),
        nftId: _.get(loan, 'id').split('/')[1],
      })

      await BorrowSnapshotModel.create({
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
    let count = 0

    for (const pool of availablePools) {
      const onChainPool = pools.find((p: any) => _.get(p, 'id', '') === pool.address?.toLowerCase())

      if (onChainPool) {
        await LendingSnapshotModel.create({
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

    logger.info(`JOB_SYNC_SNAPSHOTS sync ${count} lending snapshots... OK`)
  }
  catch (err) {
    logger.error('JOB_SYNC_SNAPSHOTS sync lending snapshot... ERR:', err)
  }
}

export default async function syncSnapshots(req: Request, res: Response, next: NextFunction) {
  try {
    await syncBorrowSnapshot(Blockchain.Ethereum())
    await syncLendingSnapshot(Blockchain.Ethereum())

    await syncBorrowSnapshot(Blockchain.Polygon())
    await syncLendingSnapshot(Blockchain.Polygon())

    res.status(200).send()
  }
  catch (err) {
    logger.error('JOB_SYNC_SNAPSHOTS Handling runtime error... ERR:', err)
    next(err)
  }
}
