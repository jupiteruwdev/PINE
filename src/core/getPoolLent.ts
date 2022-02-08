import _ from 'lodash'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import { getWeb3 } from '../utils/ethereum'
import { getPoolLoanEvents } from './getPoolLoanEvents'

export default async function getPoolLent(poolAddress: string, blockchain: Blockchain = EthBlockchain()): Promise<number> {
  switch (blockchain.network) {
    case 'ethereum': {
      const events = await getPoolLoanEvents(poolAddress, blockchain)
      const web3 = getWeb3(blockchain.network_id)
      const lentEthPerEvent = events.map(event => parseFloat(web3.utils.fromWei(event.returnValues.loan[4])))
      const totalLentEth = _.sum(lentEthPerEvent)

      return totalLentEth
    }
    default: throw Error(`Unsupported blockchain <${blockchain.network}>`)
  }
}
