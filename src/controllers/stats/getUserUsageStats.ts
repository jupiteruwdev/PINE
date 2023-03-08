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
    const lendingSnapshots = await LendingSnapshotModel.find({ lenderAddress: {
      $regex: address,
      $options: 'i',
    }, updatedAt: {
      $gt: now,
    } }).lean()

    const wethContract = getTokenContract({ blockchain: {
      network: 'ethereum',
      networkId: Blockchain.Ethereum.Network.MAIN,
    }, address: _.get(appConf.wethAddress, Blockchain.Ethereum.Network.MAIN) })

    const borrowedSnapshots = allBorrowingSnapshots.filter(snapshot => _.get(snapshot, 'borrowerAddress')?.toLowerCase() === address.toLowerCase())
    const lendedSnapshots = allBorrowingSnapshots.filter(snapsoht => _.get(snapsoht, 'lenderAddress')?.toLowerCase() === address.toLowerCase())

    const totalAmount = _.reduce(allBorrowingSnapshots, (pre, cur) => pre.plus(new BigNumber(_.get(cur, 'borrowAmount', 0))), new BigNumber(0))

    const borrowedEth = _.reduce(borrowedSnapshots, (pre, cur) => pre.plus(cur.borrowAmount ?? '0'), new BigNumber(0))
    const lendedEth = _.reduce(lendedSnapshots, (pre, cur) => pre.plus(cur.borrowAmount ?? '0'), new BigNumber(0))

    const usageEth = borrowedEth.plus(lendedEth)
    const ethCapacity = _.reduce(lendingSnapshots, (pre, cur) => pre.plus(cur.capacity ?? '0'), new BigNumber(0))
    const wethBalances = await Promise.all(_.uniqBy(lendingSnapshots, 'fundSource').map(snapshot => wethContract.methods.balanceOf(snapshot.fundSource).call()))
    const wethBalance = _.reduce(wethBalances, (pre, cur) => pre.plus(new BigNumber(cur)), new BigNumber(0))
    const ethPermissioned = _.min([ethCapacity, new BigNumber(ethers.utils.formatEther(wethBalance.toString()))]) ?? new BigNumber(0)

    const collateralPriceSum = _.reduce(borrowedSnapshots, (pre, cur) => pre.plus(new BigNumber(cur.collateralPrice?.amount ?? '0')), new BigNumber(0))

    logger.info(`Fetching user protocol usage stats for address ${address}... OK`)

    return ProtocolUsage.factory({
      usageEth: Value.$ETH(ethers.utils.formatEther(usageEth.toString()).toString()),
      usagePercent: usageEth.div(totalAmount),
      borrowedEth: Value.$ETH(ethers.utils.formatEther(borrowedEth.toString()).toString()),
      lendedEth: Value.$ETH(ethers.utils.formatEther(lendedEth.toString()).toString()),
      ethCapacity: Value.$ETH(ethPermissioned.toString()),
      collateralPrice: Value.$ETH(collateralPriceSum.toString()),
    })
  }
  catch (err) {
    logger.info(`Fetching user protocol usage stats for address ${address}... ERR:`, err)
    throw err
  }
}
