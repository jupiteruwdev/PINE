import BigNumber from 'bignumber.js'
import { ethers } from 'ethers'
import _ from 'lodash'
import { BorrowSnapshotModel } from '../../db'
import { Value } from '../../entities'
import logger from '../../utils/logger'

type Params = {
  address: string
}

export default async function getUserUsageStats({
  address,
}: Params) {
  try {
    logger.info(`Fetching user protocol usage stats for address ${address}...`)
    const now = new Date()
    now.setHours(now.getHours() - 1)
    const allSnapshots = await BorrowSnapshotModel.find({ updatedAt: {
      $gt: now,
    } }).lean()

    const borrowedSnapshots = allSnapshots.filter(snapshot => _.get(snapshot, 'borrowerAddress')?.toLowerCase() === address.toLowerCase())
    const lendedSnapshots = allSnapshots.filter(snapsoht => _.get(snapsoht, 'lenderAddress')?.toLowerCase() === address.toLowerCase())

    const totalAmount = _.reduce(allSnapshots, (pre, curr) => pre.plus(new BigNumber(_.get(curr, 'borrowAmount', 0))), new BigNumber(0))
    const usageEth = _.reduce(_.uniqBy([...borrowedSnapshots, ...lendedSnapshots], 'borrowerAddress'), (pre, curr) => pre.plus(new BigNumber(_.get(curr, 'borrowAmount', 0))), new BigNumber(0))

    logger.info(`Fetching user protocol usage stats for address ${address}... OK`)

    return {
      usageEth: Value.$ETH(ethers.utils.formatEther(usageEth.toString()).toString()),
      usagePercent: usageEth.div(totalAmount).multipliedBy(100).toFixed(2),
    }
  }
  catch (err) {
    logger.info(`Fetching user protocol usage stats for address ${address}... ERR:`, err)
    throw err
  }
}
