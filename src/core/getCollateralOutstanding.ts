import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import { AnyCurrency } from '../entities/Currency'
import Value, { $ETH } from '../entities/Value'
import { getEthWeb3 } from '../utils/ethereum'
import getCollateralLoanPosition from './getCollateralLoanPosition'

type Params = {
  nftId: number
  poolAddress: string
}

export default async function getCollateralOutstanding({ nftId, poolAddress }: Params, blockchain: Blockchain = EthBlockchain()): Promise<Value<AnyCurrency>> {
  switch (blockchain.network) {
  case 'ethereum': {
    const web3 = getEthWeb3(blockchain.network_id)
    const loanPosition = await getCollateralLoanPosition({ nftId, poolAddress }, blockchain)
    const borrowedEth = parseFloat(web3.utils.fromWei(loanPosition.borrowedWei))
    const returnedEth = parseFloat(web3.utils.fromWei(loanPosition.returnedWei))

    return $ETH(borrowedEth - returnedEth)
  }
  default:
    throw Error(`Unsupported blockchain <${blockchain.network}>`)
  }
}
