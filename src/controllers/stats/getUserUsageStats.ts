import BigNumber from 'bignumber.js'
import { ethers } from 'ethers'
import _ from 'lodash'
import appConf from '../../app.conf'
import { BorrowSnapshotModel, LendingSnapshotModel } from '../../db'
import { Value } from '../../entities'
import { Blockchain, ProtocolUsage } from '../../entities/lib'
import logger from '../../utils/logger'
import { getRewards } from '../contracts'
import getTokenUSDPrice, { AvailableToken } from '../utils/getTokenUSDPrice'

type Params = {
  address: string
}

type GetUsageValuesParams = {
  lendingSnapshots: any[]
  borrowingSnapshots: any[]
  address: string
  tokenPrices?: Record<string, Value | null>
}

const tokenUSDPrice: Record<string, Value | null> = {
  [Blockchain.Ethereum.Network.MAIN]: null,
  [Blockchain.Polygon.Network.MAIN]: null,
}

const blockedCollections = [
  '0x04c003461abc646a5c22353edf8e8edc16837492',
  '0x5a7869db28eb513945167293638d59a336a89190',
  '0x87e738a3d5e5345d6212d8982205a564289e6324',
  '0xdb0373feaa9e2af8515fd2827ef7c4243bdcba07',
  '0xde494e809e28e70d5e2a26fb402e263030089214',
]

export function convertNativeToUSD(snapshot: any, key: string, parse = true, tokenPrices?: Record<string, Value | null>): BigNumber {
  const blockchain = Blockchain.factory({
    network: _.get(snapshot, 'networkType', 'ethereum'),
    networkId: _.get(snapshot, 'networkId', '1'),
  })

  const value = parse ? ethers.utils.formatEther(new BigNumber(_.get(snapshot, key) ?? '0').toFixed()) : _.get(snapshot, key)

  return new BigNumber(value).times((tokenPrices || tokenUSDPrice)[blockchain.networkId]?.amount ?? '0')
}

export async function getUsageValues({ lendingSnapshots, borrowingSnapshots, address, tokenPrices }: GetUsageValuesParams) {
  const allEVMChains = Blockchain.allChains().filter(blockchain => blockchain.network !== 'solana')
  const borrowedSnapshots = borrowingSnapshots.filter(snapshot => _.get(snapshot, 'borrowerAddress')?.toLowerCase() === address.toLowerCase())
  const lendedSnapshots = borrowingSnapshots.filter(snapsoht => _.get(snapsoht, 'lenderAddress')?.toLowerCase() === address.toLowerCase())

  const lendingSnapshotsForAdddress = lendingSnapshots.filter(snapshot => _.get(snapshot, 'lenderAddress')?.toLowerCase() === address.toLowerCase())

  const totalAmountUSD = _.reduce(borrowingSnapshots, (pre, cur) => pre.plus(convertNativeToUSD(cur, 'borrowAmount', true, tokenPrices)), new BigNumber(0))

  const borrowedUSD = _.reduce(borrowedSnapshots, (pre, cur) => pre.plus(convertNativeToUSD(cur, 'borrowAmount', true, tokenPrices)), new BigNumber(0))
  const lendedUSD = _.reduce(lendedSnapshots, (pre, cur) => pre.plus(convertNativeToUSD(cur, 'borrowAmount', true, tokenPrices)), new BigNumber(0))

  const usdPermissioned = _.reduce(
    allEVMChains.map(blockchain => _.reduce(_.values(_.groupBy(lendingSnapshotsForAdddress.filter(snapshot => (snapshot.networkId || '1') === blockchain.networkId), 'fundSource')), (pre, cur) => pre.plus(BigNumber.max(...cur.map(snapshot => convertNativeToUSD(snapshot, 'capacity', false, tokenPrices)))), new BigNumber(0))),
    (pre, cur) => pre.plus(cur),
    new BigNumber(0)
  )

  const usdPermissionedAll = _.reduce(
    allEVMChains.map(blockchain => _.reduce(_.values(_.groupBy(lendingSnapshots.filter(snapshot => (snapshot.networkId || '1') === blockchain.networkId), 'fundSource')), (pre, cur) => pre.plus(BigNumber.max(...cur.map(snapshot => convertNativeToUSD(snapshot, 'capacity', false, tokenPrices)))), new BigNumber(0))),
    (pre, cur) => pre.plus(cur),
    new BigNumber(0)
  )

  const collateralPriceSumForUser = _.reduce(borrowedSnapshots, (pre, cur) => pre.plus(convertNativeToUSD(cur, 'collateralPrice.amount', false, tokenPrices)), new BigNumber(0))
  const collateralPriceSumAll = _.reduce(borrowingSnapshots, (pre, cur) => pre.plus(convertNativeToUSD(cur, 'collateralPrice.amount', false, tokenPrices)), new BigNumber(0))

  const usagePercent = (totalAmountUSD.gt(0) ? borrowedUSD.div(totalAmountUSD).multipliedBy(42) : new BigNumber(0))
    .plus(collateralPriceSumAll.gt(0) ? collateralPriceSumForUser.div(collateralPriceSumAll).multipliedBy(18) : new BigNumber(0))
    .plus(usdPermissionedAll.gt(0) ? usdPermissioned.div(usdPermissionedAll).multipliedBy(12) : new BigNumber(0))
    .plus(totalAmountUSD.gt(0) ? lendedUSD.div(totalAmountUSD).multipliedBy(28) : new BigNumber(0))

  const totalPercent = (
    totalAmountUSD.gt(0) ? new BigNumber(42) : new BigNumber(0)
  )
    .plus(collateralPriceSumAll.gt(0) ? new BigNumber(18) : new BigNumber(0))
    .plus(usdPermissionedAll.gt(0) ? new BigNumber(12) : new BigNumber(0))
    .plus(totalAmountUSD.gt(0) ? new BigNumber(28) : new BigNumber(0))

  return {
    usagePercent,
    totalPercent,
    borrowedUSD,
    lendedUSD,
    usdPermissioned,
    collateralPriceSumForUser,
    collateralPriceSumAll,
    totalAmountUSD,
    usdPermissionedAll,
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
    }, collectionAddress: {
      $not: {
        $in: blockedCollections,
      },
    } }).sort({ createdAt: 1 }).lean()
    const allLendingSnapshots = await LendingSnapshotModel.find({ updatedAt: {
      $gt: prevFriday,
    }, collectionAddress: {
      $not: {
        $in: blockedCollections,
      },
    } }).sort({ createdAt: 1 }).lean()
    let incentiveRewards = new BigNumber(0)

    while (1) {
      const currentSnapshotTime = prevFriday.getTime()
      prevFriday.setUTCHours(prevFriday.getUTCHours() + 1)
      const currentBorrowingSnapshots = allBorrowingSnapshots.filter(snapshot => new Date(_.get(snapshot, 'createdAt')).getTime() > currentSnapshotTime && new Date(_.get(snapshot, 'createdAt')).getTime() < prevFriday.getTime())
      const currentLendingSnapshots = allLendingSnapshots.filter(snapshot => new Date(_.get(snapshot, 'createdAt')).getTime() > currentSnapshotTime && new Date(_.get(snapshot, 'createdAt')).getTime() < prevFriday.getTime())

      const { usagePercent, totalPercent } = await getUsageValues({ address, lendingSnapshots: currentLendingSnapshots, borrowingSnapshots: currentBorrowingSnapshots })
      const protocolIncentivePerHour = appConf.incentiveRewards / 12 / 24 / 7

      if (totalPercent.gt('0')) { incentiveRewards = incentiveRewards.plus(usagePercent.times(protocolIncentivePerHour).div(totalPercent)) }
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
    const nativeTokenPrices = await Promise.all(evmBlockchains.map(blockchain => getTokenUSDPrice(Blockchain.parseNativeToken(blockchain) as AvailableToken)))
    evmBlockchains.forEach((blockchain, i) => tokenUSDPrice[blockchain.networkId] = nativeTokenPrices[i])

    const allBorrowingSnapshots = await BorrowSnapshotModel.find({ updatedAt: {
      $gt: now,
    }, collectionAddress: {
      $not: {
        $in: blockedCollections,
      },
    } }).lean()
    const allLendingSnapshots = await LendingSnapshotModel.find({ updatedAt: {
      $gt: now,
    }, collectionAddress: {
      $not: {
        $in: blockedCollections,
      },
    } }).lean()

    const {
      usagePercent,
      borrowedUSD,
      lendedUSD,
      usdPermissioned,
      collateralPriceSumForUser,
      collateralPriceSumAll,
      totalAmountUSD,
      usdPermissionedAll,
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
      borrowedUSD: Value.$USD(borrowedUSD.toString()),
      lendedUSD: Value.$USD(lendedUSD.toString()),
      usdCapacity: Value.$USD(usdPermissioned.toString()),
      collateralPrice: Value.$USD(collateralPriceSumForUser.toString()),
      totalCollateralPrice: Value.$USD(collateralPriceSumAll.toString()),
      totalBorrowedUSD: Value.$USD(totalAmountUSD.toString()),
      totalLendedUSD: Value.$USD(totalAmountUSD.toString()),
      totalUSDCapacity: Value.$USD(usdPermissionedAll.toString()),
      estimateRewards: Value.$PINE(usagePercent.multipliedBy(protocolIncentivePerHour).multipliedBy(24).div(100)),
      incentiveReward: appConf.incentiveRewards,
      nextSnapshot: now,
      rewards,
    })
  }
  catch (err) {
    logger.info(`Fetching user protocol usage stats for address ${address}... ERR:`, err)
    throw err
  }
}
