import BigNumber from 'bignumber.js'
import { Blockchain, Value } from '../../entities'
import { getEthWeb3 } from '../../utils/ethereum'
import fault from '../../utils/fault'
import { getPoolHistoricalLoanEvents } from './getPoolHistoricalLoanEvents'

type Params = {
  blockchain: Blockchain
  poolAddress: string
}

export default async function getPoolHistoricalLent({ blockchain, poolAddress }: Params): Promise<Value> {
  switch (blockchain.network) {
  case 'ethereum': {
    const web3 = getEthWeb3(blockchain.networkId)
    const events = await getPoolHistoricalLoanEvents({ blockchain, poolAddress })
    const lentWeiPerEvent = events.map(event => new BigNumber(event.returnValues.loan[4]))
    const totalLentWei = lentWeiPerEvent.reduce((p, c) => p.plus(c), new BigNumber(0))
    const totalLentEth = web3.utils.fromWei(totalLentWei.toFixed())

    return Value.$ETH(totalLentEth)
  }
  default:
    throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
  }
}
