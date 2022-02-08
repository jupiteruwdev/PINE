import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import { getWeb3 } from '../utils/ethereum'
import getCollateralLoanPosition from './getCollateralLoanPosition'

export default async function getCollateralOutstanding(nftId: number, poolAddress: string, blockchain: Blockchain = EthBlockchain()) {
  switch (blockchain.network) {
  case 'ethereum': {
    const web3 = getWeb3(blockchain.network_id)
    const loanPosition = await getCollateralLoanPosition(nftId, poolAddress, blockchain)
    const borrowedEth = parseFloat(web3.utils.fromWei(loanPosition.borrowedWei))
    const returnedEth = parseFloat(web3.utils.fromWei(loanPosition.returnedWei))

    return borrowedEth - returnedEth
  }
  default: throw Error(`Unsupported blockchain <${blockchain.network}>`)
  }
}
