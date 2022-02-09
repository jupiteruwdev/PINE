import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import { $ETH } from '../entities/Currency'
import { getWeb3 } from '../utils/ethereum'
import getCollateralLoanPosition from './getCollateralLoanPosition'

type Params = {
  nftId: number
  poolAddress: string
}

export default async function getCollateralOutstanding({ nftId, poolAddress }: Params, blockchain: Blockchain = EthBlockchain()) {
  switch (blockchain.network) {
  case 'ethereum': {
    const web3 = getWeb3(blockchain.network_id)
    const loanPosition = await getCollateralLoanPosition({ nftId, poolAddress }, blockchain)
    const borrowedEth = parseFloat(web3.utils.fromWei(loanPosition.borrowedWei))
    const returnedEth = parseFloat(web3.utils.fromWei(loanPosition.returnedWei))

    return {
      value: borrowedEth - returnedEth,
      currency: $ETH(blockchain.network_id),
    }
  }
  default:
    throw Error(`Unsupported blockchain <${blockchain.network}>`)
  }
}
