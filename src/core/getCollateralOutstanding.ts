import Blockchain from '../entities/Blockchain'
import { AnyCurrency } from '../entities/Currency'
import Value, { $ETH } from '../entities/Value'
import { getEthWeb3 } from '../utils/ethereum'
import failure from '../utils/failure'
import getCollateralLoanPosition from './getCollateralLoanPosition'

type Params = {
  blockchain: Blockchain
  nftId: string
  poolAddress: string
}

export default async function getCollateralOutstanding({ blockchain, nftId, poolAddress }: Params): Promise<Value<AnyCurrency>> {
  switch (blockchain.network) {
  case 'ethereum': {
    const web3 = getEthWeb3(blockchain.networkId)
    const loanPosition = await getCollateralLoanPosition({ blockchain, nftId, poolAddress })
    const borrowedEth = parseFloat(web3.utils.fromWei(loanPosition.borrowedWei))
    const returnedEth = parseFloat(web3.utils.fromWei(loanPosition.returnedWei))

    return $ETH(borrowedEth - returnedEth)
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
