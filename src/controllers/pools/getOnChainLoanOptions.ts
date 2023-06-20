import BigNumber from 'bignumber.js'
import _ from 'lodash'
import PoolHelperABI from '../../abis/PoolHelper.json' assert { type: 'json' }
import appConf from '../../app.conf'
import fault from '../../utils/fault'
import getEthWeb3 from '../utils/getEthWeb3'

type Params = {
  addresses: string[]
  networkId: string
}

export default async function getOnChainLoanOptions({ addresses, networkId }: Params) {
  try {
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
  catch (err) {
    throw fault('ERR_GET_ON_CHAIN_LOAN_OPTIONS', undefined, err)
  }
}
