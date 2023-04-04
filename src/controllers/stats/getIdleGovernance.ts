import BigNumber from 'bignumber.js'
import { ethers } from 'ethers'
import _ from 'lodash'
import VEPINE_ABI from '../../abis/VePine.json' assert { type: 'json' }
import appConf from '../../app.conf'
import { Blockchain, IdleGovernance } from '../../entities'
import { getOnChainPineStats } from '../../subgraph'
import logger from '../../utils/logger'
import getEthWeb3 from '../utils/getEthWeb3'
import getTokenUSDPrice, { AvailableToken } from '../utils/getTokenUSDPrice'

export default async function getIdleGovernance(): Promise<IdleGovernance> {
  try {
    logger.info('Fetching idle governance stats...')
    const web3 = getEthWeb3(Blockchain.Polygon.Network.MAIN)
    const contract = new web3.eth.Contract(VEPINE_ABI as any[], appConf.vePINEAddress)
    const pinePrice = await getTokenUSDPrice(AvailableToken.PINE)
    const weeklyPineReward = new BigNumber(appConf.incentiveRewards / 12 + appConf.stakingRewards)
    const { pineStat } = await getOnChainPineStats({ networkId: Blockchain.Polygon.Network.MAIN })
    const burnt = new BigNumber(ethers.utils.formatEther(_.get(pineStat, 'burnt')))
    const totalSupply = await contract.methods.totalSupply().call()
    const staked = new BigNumber(ethers.utils.formatEther(totalSupply)).minus(burnt).toFixed()
    const totalVeSb = ethers.utils.formatEther(await contract.methods.totalVeSb().call())
    const apyStake = new BigNumber(0.0594).div(totalVeSb).times((appConf.stakingRewards / 7) * 365)
    const apyBurnt = new BigNumber((appConf.stakingRewards / 7) * 365).div(totalVeSb).times(100)

    return IdleGovernance.factory({
      pinePrice,
      totalWeeklyReward: weeklyPineReward,
      totalPineStaked: staked,
      totalPineBurnt: burnt,
      apyStake,
      apyBurnt,
    })
  }
  catch (err) {
    logger.error('Fetching idle governance stats... ERR:', err)
    throw err
  }
}
