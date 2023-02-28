import BigNumber from 'bignumber.js'
import EthDater from 'ethereum-block-by-date'
import VEPINE_ABI from '../../abis/VePine.json' assert { type: 'json' }
import appConf from '../../app.conf'
import { Value } from '../../entities'
import getEthWeb3 from '../utils/getEthWeb3'

type Params = {
  address: string
}

/**
 * quick implementation for governance:
 * TODO: update after polygon support merge
 */

export default async function getRewards({ address }: Params): Promise<Value<'PINE'>> {
  const web3 = getEthWeb3('137')
  const contract = new web3.eth.Contract(VEPINE_ABI as any[], appConf.vePINEAddress)
  const currentBlock = await web3.eth.getBlockNumber()
  const today = new Date()
  const dayOfWeek = today.getDay()
  const prevSaturday = new Date(today)

  prevSaturday.setDate(today.getDate() - dayOfWeek - 1)
  prevSaturday.setUTCHours(8)
  prevSaturday.setUTCMinutes(0)
  prevSaturday.setUTCSeconds(0)
  prevSaturday.setUTCMilliseconds(0)

  const dater = new EthDater(web3)
  const { block: startBlock } = await dater.getDate(prevSaturday)

  let totalReward = new BigNumber(0)

  for (let block = startBlock; block <= currentBlock; block += appConf.snapshotPeriod) {
    const [userVeSb, totalVeSb] = await Promise.all([
      contract.methods.userVeSb(address).call(undefined, block),
      contract.methods.totalVeSb().call(undefined, block),
    ])
    totalReward = totalReward.plus(new BigNumber(userVeSb).div(new BigNumber(totalVeSb)))
  }

  return Value.$PINE(totalReward.multipliedBy(appConf.rewardPINE).toString())
}
