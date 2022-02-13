import _ from 'lodash'
import Blockchain from '../entities/Blockchain'
import Value, { $ETH } from '../entities/Value'
import { getEthWeb3 } from '../utils/ethereum'
import failure from '../utils/failure'
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
    const lentEthPerEvent = events.map(event => parseFloat(web3.utils.fromWei(event.returnValues.loan[4])))
    const totalLentEth = _.sum(lentEthPerEvent)

    return $ETH(totalLentEth)
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
