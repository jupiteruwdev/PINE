import BigNumber from 'bignumber.js'
import EthDater from 'ethereum-block-by-date'
import { ethers } from 'ethers'
import VEPINE_ABI from '../../abis/VePine.json' assert { type: 'json' }
import appConf from '../../app.conf'
import { MerkleTreeModel } from '../../db'
import { Value } from '../../entities'
import Rewards from '../../entities/lib/Rewards'
import getEthWeb3 from '../utils/getEthWeb3'

type Params = {
  address: string
}

/**
 * quick implementation for governance:
 * TODO: update after polygon support merge
 */

export default async function getRewards({ address }: Params): Promise<Rewards> {
  const web3 = getEthWeb3('137')
  const contract = new web3.eth.Contract(VEPINE_ABI as any[], appConf.vePINEAddress)
  const currentBlock = await web3.eth.getBlockNumber()
  const today = new Date()
  const dayOfWeek = today.getUTCDay()
  const prevFriday = new Date(today)

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

  const dater = new EthDater(web3)
  const { block: startBlock } = await dater.getDate(prevFriday)

  let totalReward = new BigNumber(0)

  for (let block = startBlock; block <= currentBlock; block += appConf.snapshotPeriod) {
    const [userVeSb, totalVeSb] = await Promise.all([
      contract.methods.userVeSb(address).call(undefined, block),
      contract.methods.totalVeSb().call(undefined, block),
    ])
    totalReward = totalReward.plus(new BigNumber(userVeSb).div(new BigNumber(totalVeSb)))
  }

  const unclaimedRewards = await MerkleTreeModel.find({ address: address.toLowerCase(), claimed: false }).lean()

  return Rewards.factory({
    liveRewards: Value.$PINE(totalReward.multipliedBy(appConf.rewardPINE).toString()),
    unclaimedRewards: unclaimedRewards.map(ur => ({
      address: ur.address ?? '',
      root: ur.root ?? '',
      leaf: ur.leaf ?? '',
      proof: ur.proof ?? [],
      amount: Value.$PINE(ethers.utils.formatEther(ur.amount ?? 0)),
      index: ur.index ?? 0,
    })),
  })
}
