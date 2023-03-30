import BigNumber from 'bignumber.js'
import { ethers } from 'ethers'
import _ from 'lodash'
import appConf from '../../app.conf'
import { BorrowSnapshotModel, LendingSnapshotModel } from '../../db'
import { Value } from '../../entities'
import { Blockchain, ProtocolUsage } from '../../entities/lib'
import logger from '../../utils/logger'
import { getRewards } from '../contracts'

type Params = {
  address: string
}

type GetUsageValuesParams = {
  lendingSnapshots: any[]
  borrowingSnapshots: any[]
  address: string
}

async function getUsageValues({ lendingSnapshots, borrowingSnapshots, address }: GetUsageValuesParams) {
  const borrowedSnapshots = borrowingSnapshots.filter(snapshot => _.get(snapshot, 'borrowerAddress')?.toLowerCase() === address.toLowerCase())
  const lendedSnapshots = borrowingSnapshots.filter(snapsoht => _.get(snapsoht, 'lenderAddress')?.toLowerCase() === address.toLowerCase())

  const lendingSnapshotsForAdddress = lendingSnapshots.filter(snapshot => _.get(snapshot, 'lenderAddress')?.toLowerCase() === address.toLowerCase())

  const totalAmount = _.reduce(borrowingSnapshots, (pre, cur) => pre.plus(new BigNumber(cur.borrowAmount ?? '0')), new BigNumber(0))

  const borrowedEth = _.reduce(borrowedSnapshots, (pre, cur) => pre.plus(cur.borrowAmount ?? '0'), new BigNumber(0))
  const lendedEth = _.reduce(lendedSnapshots, (pre, cur) => pre.plus(cur.borrowAmount ?? '0'), new BigNumber(0))

  const ethPermissioned = _.reduce(_.values(_.groupBy(lendingSnapshotsForAdddress, 'fundSource')), (pre, cur) => pre.plus(BigNumber.max(...cur.map(snapshot => new BigNumber(snapshot.capacity ?? '0')))), new BigNumber(0))

  const ethPermissionedAll = _.reduce(_.values(_.groupBy(lendingSnapshots, 'fundSource')), (pre, cur) => pre.plus(BigNumber.max(...cur.map(snapshot => new BigNumber(snapshot.capacity ?? '0')))), new BigNumber(0))

  const collateralPriceSumForUser = _.reduce(borrowedSnapshots, (pre, cur) => pre.plus(new BigNumber(cur.collateralPrice?.amount ?? '0')), new BigNumber(0))
  const collateralPriceSumAll = _.reduce(borrowingSnapshots, (pre, cur) => pre.plus(new BigNumber(cur.collateralPrice?.amount ?? '0')), new BigNumber(0))

  const usagePercent = (totalAmount.gt(0) ? borrowedEth.div(totalAmount).multipliedBy(42) : new BigNumber(0))
    .plus(collateralPriceSumAll.gt(0) ? collateralPriceSumForUser.div(collateralPriceSumAll).multipliedBy(18) : new BigNumber(0))
    .plus(ethPermissionedAll.gt(0) ? ethPermissioned.div(ethPermissionedAll).multipliedBy(12) : new BigNumber(0))
    .plus(totalAmount.gt(0) ? lendedEth.div(totalAmount).multipliedBy(28) : new BigNumber(0))

  return {
    usagePercent,
    borrowedEth,
    lendedEth,
    ethPermissioned,
    collateralPriceSumForUser,
    collateralPriceSumAll,
    totalAmount,
    ethPermissionedAll,
  }
}

async function getIncentiveRewards({ address }: Params): Promise<{
  incentiveRewards: BigNumber
  epochStartBlock?: number
}> {
  try {
    const today = new Date()
    const dayOfWeek = today.getUTCDay()
    const prevFriday = new Date(today)
    const now = new Date()

    if (dayOfWeek < 5 || (dayOfWeek === 5 && prevFriday.getUTCHours() <= 7)) {
      prevFriday.setDate(today.getDate() - dayOfWeek - 2)
    }
    else if (dayOfWeek >= 5) {
      prevFriday.setDate(today.getDate() - dayOfWeek + 5)
    }
    prevFriday.setUTCHours(8)
    prevFriday.setUTCMinutes(0)
    prevFriday.setUTCSeconds(0)
    prevFriday.setUTCMilliseconds(0)

    const allBorrowingSnapshots = await BorrowSnapshotModel.find({ updatedAt: {
      $gt: prevFriday,
    } }).sort({ createdAt: 1 }).lean()
    const allLendingSnapshots = await LendingSnapshotModel.find({ updatedAt: {
      $gt: prevFriday,
    } }).sort({ createdAt: 1 }).lean()
    let incentiveRewards = new BigNumber(0)

    while (1) {
      const currentSnapshotTime = prevFriday.getTime()
      prevFriday.setUTCHours(prevFriday.getUTCHours() + 1)
      const currentBorrowingSnapshots = allBorrowingSnapshots.filter(snapshot => new Date(_.get(snapshot, 'createdAt')).getTime() > currentSnapshotTime && new Date(_.get(snapshot, 'createdAt')).getTime() < prevFriday.getTime())
      const currentLendingSnapshots = allLendingSnapshots.filter(snapshot => new Date(_.get(snapshot, 'createdAt')).getTime() > currentSnapshotTime && new Date(_.get(snapshot, 'createdAt')).getTime() < prevFriday.getTime())

      const { usagePercent } = await getUsageValues({ address, lendingSnapshots: currentLendingSnapshots, borrowingSnapshots: currentBorrowingSnapshots })
      const protocolIncentivePerHour = appConf.incentiveRewards / 12 / 24 / 7

      incentiveRewards = incentiveRewards.plus(usagePercent.times(protocolIncentivePerHour).div(100))
      if (prevFriday.getTime() > now.getTime()) break
    }

    return {
      incentiveRewards,
      epochStartBlock: allBorrowingSnapshots[0].blockNumber,
    }
  }
  catch (err) {
    throw err
  }
}

export default async function getUserUsageStats({
  address,
}: Params) {
  try {
    logger.info(`Fetching user protocol usage stats for address ${address}...`)
    const now = new Date()
    now.setHours(now.getHours() - 1)
    const evmBlockchains = Blockchain.allChains().filter(blockchain => blockchain.network !== 'solana')
    for (const blockchain of evmBlockchains) {
      const allBorrowingSnapshots = await BorrowSnapshotModel.find({ updatedAt: {
        $gt: now,
      }, networkId: blockchain.networkId }).lean()
      const allLendingSnapshots = await LendingSnapshotModel.find({ updatedAt: {
        $gt: now,
      }, networkId: blockchain.networkId }).lean()

      const {
        usagePercent,
        borrowedEth,
        lendedEth,
        ethPermissioned,
        collateralPriceSumForUser,
        collateralPriceSumAll,
        totalAmount,
        ethPermissionedAll,
      } = await getUsageValues({
        address,
        lendingSnapshots: allLendingSnapshots,
        borrowingSnapshots: allBorrowingSnapshots,
      })
      const { incentiveRewards: protocolIncentiveRewards, epochStartBlock } = await getIncentiveRewards({ address })

      now.setHours(now.getHours() + 2)
      now.setMinutes(0)
      now.setSeconds(0)
      now.setMilliseconds(0)

      const rewards = await getRewards({ address, epochStartBlock })

      const protocolIncentivePerHour = appConf.incentiveRewards / 12 / 24 / 7

      rewards.liveRewards.amount = rewards.liveRewards.amount.plus(protocolIncentiveRewards)

      return ProtocolUsage.factory({
        usagePercent: usagePercent.div(100),
        borrowedEth: Value.$ETH(ethers.utils.formatEther(borrowedEth.toString()).toString()),
        lendedEth: Value.$ETH(ethers.utils.formatEther(lendedEth.toString()).toString()),
        ethCapacity: Value.$ETH(ethPermissioned.toString()),
        collateralPrice: Value.$ETH(collateralPriceSumForUser.toString()),
        totalCollateralPrice: Value.$ETH(collateralPriceSumAll.toString()),
        totalBorrowedEth: Value.$ETH(ethers.utils.formatEther(totalAmount.toString()).toString()),
        totalLendedEth: Value.$ETH(ethers.utils.formatEther(totalAmount.toString()).toString()),
        totalEthCapacity: Value.$ETH(ethPermissionedAll.toString()),
        estimateRewards: Value.$PINE(usagePercent.multipliedBy(protocolIncentivePerHour).multipliedBy(24).div(100)),
        incentiveReward: appConf.incentiveRewards,
        nextSnapshot: now,
        rewards,
      })
    }

  }
  catch (err) {
    logger.info(`Fetching user protocol usage stats for address ${address}... ERR:`, err)
    throw err
  }
}
