import _ from 'lodash'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import { $ETH } from '../entities/Value'
import { getEthWeb3 } from '../utils/ethereum'
import { getPoolLoanEvents } from './getPoolLoanEvents'

type Params = {
  poolAddress: string
}

export default async function getPoolLent({ poolAddress }: Params, blockchain: Blockchain = EthBlockchain()) {
  switch (blockchain.network) {
  case 'ethereum': {
    const web3 = getEthWeb3(blockchain.network_id)
    const events = await getPoolLoanEvents({ poolAddress }, blockchain)
    const lentEthPerEvent = events.map(event => parseFloat(web3.utils.fromWei(event.returnValues.loan[4])))
    const totalLentEth = _.sum(lentEthPerEvent)

    return $ETH(totalLentEth)
  }
  default:
    throw Error(`Unsupported blockchain <${blockchain.network}>`)
  }
}
