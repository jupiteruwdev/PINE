import BigNumber from 'bignumber.js'
import { ethers } from 'ethers'
import _ from 'lodash'
import appConf from '../../app.conf'
import { BorrowSnapshotModel, LendingSnapshotModel } from '../../db'
import { Value } from '../../entities'
import { Blockchain, ProtocolUsage } from '../../entities/lib'
import logger from '../../utils/logger'
import { getTokenContract } from '../contracts'

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
    const allBorrowingSnapshots = await BorrowSnapshotModel.find({ updatedAt: {
      $gt: now,
    } }).lean()
    const allLendingSnapshots = await LendingSnapshotModel.find({ updatedAt: {
      $gt: now,
    } }).lean()

    const wethContract = getTokenContract({ blockchain: {
      network: 'ethereum',
      networkId: Blockchain.Ethereum.Network.MAIN,
    }, address: _.get(appConf.wethAddress, Blockchain.Ethereum.Network.MAIN) })

    const borrowedSnapshots = allBorrowingSnapshots.filter(snapshot => _.get(snapshot, 'borrowerAddress')?.toLowerCase() === address.toLowerCase())
    const lendedSnapshots = allBorrowingSnapshots.filter(snapsoht => _.get(snapsoht, 'lenderAddress')?.toLowerCase() === address.toLowerCase())

    const lendingSnapshots = allLendingSnapshots.filter(snapshot => _.get(snapshot, 'lenderAddress')?.toLowerCase() === address.toLowerCase())

    const totalAmount = _.reduce(allBorrowingSnapshots, (pre, cur) => pre.plus(new BigNumber(_.get(cur, 'borrowAmount', 0))), new BigNumber(0))

    const borrowedEth = _.reduce(borrowedSnapshots, (pre, cur) => pre.plus(cur.borrowAmount ?? '0'), new BigNumber(0))
    const lendedEth = _.reduce(lendedSnapshots, (pre, cur) => pre.plus(cur.borrowAmount ?? '0'), new BigNumber(0))

    const ethCapacity = _.reduce(lendingSnapshots, (pre, cur) => pre.plus(cur.capacity ?? '0'), new BigNumber(0))
    const ethCapacityAll = _.reduce(allLendingSnapshots, (pre, cur) => pre.plus(cur.capacity ?? '0'), new BigNumber(0))

    const wethBalances = await Promise.all(_.uniqBy(lendingSnapshots, 'fundSource').map(snapshot => wethContract.methods.balanceOf(snapshot.fundSource).call()))
    const wethBalance = _.reduce(wethBalances, (pre, cur) => pre.plus(new BigNumber(cur)), new BigNumber(0))
    const ethPermissioned = _.min([ethCapacity, new BigNumber(ethers.utils.formatEther(wethBalance.toString()))]) ?? new BigNumber(0)

    const allWethBalances = await Promise.all(_.uniqBy(allLendingSnapshots, 'fundSource').map(snapshot => wethContract.methods.balanceOf(snapshot.fundSource).call()))
    const wethBalanceAll = _.reduce(allWethBalances, (pre, cur) => pre.plus(new BigNumber(cur)), new BigNumber(0))
    const ethPermissionedAll = _.min([ethCapacityAll, new BigNumber(ethers.utils.formatEther(wethBalanceAll.toString()))]) ?? new BigNumber(0)

    const collateralPriceSumForUser = _.reduce(borrowedSnapshots, (pre, cur) => pre.plus(new BigNumber(cur.collateralPrice?.amount ?? '0')), new BigNumber(0))
    const collateralPriceSumAll = _.reduce(allBorrowingSnapshots, (pre, cur) => pre.plus(new BigNumber(cur.collateralPrice?.amount ?? '0')), new BigNumber(0))

    const protocolUsage = ethers.utils.formatEther(
      borrowedEth.multipliedBy(42)
        .plus(collateralPriceSumForUser.multipliedBy(18))
        .plus(lendedEth.multipliedBy(28))
        .plus(ethPermissioned.multipliedBy(12))
        .div(100).toFixed(0)
    )

    const usagePercent = borrowedEth.div(totalAmount).multipliedBy(42)
      .plus(collateralPriceSumForUser.div(collateralPriceSumAll).multipliedBy(18))
      .plus(ethPermissioned.div(ethPermissionedAll).multipliedBy(12))
      .plus(lendedEth.div(totalAmount).multipliedBy(28))

    logger.info(`Fetching user protocol usage stats for address ${address}... OK`)

    return ProtocolUsage.factory({
      usage: new BigNumber(protocolUsage).toFixed(4),
      usagePercent,
      borrowedEth: Value.$ETH(ethers.utils.formatEther(borrowedEth.toString()).toString()),
      lendedEth: Value.$ETH(ethers.utils.formatEther(lendedEth.toString()).toString()),
      ethCapacity: Value.$ETH(ethPermissioned.toString()),
      collateralPrice: Value.$ETH(collateralPriceSumForUser.toString()),
      totalCollateralPrice: Value.$ETH(collateralPriceSumAll.toString()),
      totalBorrowedEth: Value.$ETH(ethers.utils.formatEther(totalAmount.toString()).toString()),
      totalLendedEth: Value.$ETH(ethers.utils.formatEther(totalAmount.toString()).toString()),
      totalEthCapacity: Value.$ETH(ethPermissionedAll.toString()),
    })
  }
  catch (err) {
    logger.info(`Fetching user protocol usage stats for address ${address}... ERR:`, err)
    throw err
  }
}
