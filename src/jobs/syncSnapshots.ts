import { NextFunction, Request, Response } from 'express'
import _ from 'lodash'
import { getEthNFTValuation } from '../controllers'
import { BorrowSnapshotModel, LendingSnapshotModel, PoolModel } from '../db'
import { Blockchain } from '../entities'
import { getOnChainLoans, getOnChainPools } from '../subgraph'
import logger from '../utils/logger'

async function syncBorrowSnapshot(networkId: string) {
  try {
    logger.info('JOB_SYNC_SNAPSHOTS sync borrow snapshot')
    const loans = await getOnChainLoans({}, { networkId })

    for (const loan of loans) {
      const floorPrice = await getEthNFTValuation({
        blockchain: {
          network: 'ethereum',
          networkId,
        },
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
          amount: floorPrice.value?.amount.toString(),
          currency: floorPrice.value?.currency,
        },
      })
    }
    logger.info(`JOB_SYNC_SNAPSHOTS sync ${loans.length} borrow snapshots... OK`)
  }
  catch (err) {
    logger.error('JOB_SYNC_SNAPSHOTS sync borrow snapshot... ERR:', err)
  }
}

async function syncLendingSnapshot(networkId: string) {
  try {
    logger.info('JOB_SYNC_SNAPSHOTS sync lending snapshot')
    const { pools } = await getOnChainPools({}, { networkId })
    const availablePools = await PoolModel.find({ retired: false }).lean()
    let count = 0

    for (const pool of availablePools) {
      const onChainPool = pools.find((p: any) => _.get(p, 'id', '') === pool.address?.toLowerCase())

      if (onChainPool) {
        await LendingSnapshotModel.create({
          lenderAddress: _.get(onChainPool, 'lenderAddress'),
          collectionAddress: _.get(onChainPool, 'collection'),
          fundSource: _.get(onChainPool, 'fundSource'),
          capacity: _.min([pool.ethLimit, pool.valueLockedEth]),
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
    await syncBorrowSnapshot(Blockchain.Ethereum.Network.MAIN)
    await syncLendingSnapshot(Blockchain.Ethereum.Network.MAIN)

    res.status(200).send()
  }
  catch (err) {
    logger.error('JOB_SYNC_SNAPSHOTS Handling runtime error... ERR:', err)
    next(err)
  }
}
