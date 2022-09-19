import getEthWeb3 from '../utils/getEthWeb3'
import PoolHelperABI from '../../abis/PoolHelper.json' assert { type: 'json' }
import appConf from '../../app.conf'
import _ from 'lodash'
import BigNumber from 'bignumber.js'

type Params = {
  addresses: string[]
  networkId: string
}

export default async function getOnChainLoanOptions({ addresses, networkId }: Params) {
  const web3 = getEthWeb3(networkId)
  const poolHelper = new web3.eth.Contract(PoolHelperABI as any, _.get(appConf.poolHelperAddress, networkId))
  const res = await poolHelper.methods.checkLoanOptions(addresses).call()
  const loanOptionsDict = res.reduce((prev: any, curr: any) => {
    const { poolAddress, durationSeconds, interestBPS1000000XBlock, collateralFactorBPS } = curr
    const _address = poolAddress.toLowerCase()
    const loanDurationSecond = Number(durationSeconds)
    const loanDurationBlock = loanDurationSecond / appConf.blocksPerSecond
    const interestBpsBlock = new BigNumber(interestBPS1000000XBlock).div(1_000_000)
    const maxLtvBps = Number(collateralFactorBPS)

    return {
      ...prev,
      [_address]: [...prev[_address] ?? [], {
        loanDurationSecond,
        loanDurationBlock,
        maxLtvBps,
        interestBpsBlock,
      }],
    }
  }, {})
  return loanOptionsDict
}
