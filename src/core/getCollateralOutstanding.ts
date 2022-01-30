import { getWeb3, Web3Options } from '../utils/ethereum'
import getCollateralLoanPosition from './getCollateralLoanPosition'

export default async function getCollateralOutstanding(nftId: number, poolAddress: string, options: Web3Options = {}) {
  const web3 = getWeb3(options)
  const loanPosition = await getCollateralLoanPosition(nftId, poolAddress, options)
  const borrowedEth = parseFloat(web3.utils.fromWei(loanPosition.borrowedWei))
  const returnedEth = parseFloat(web3.utils.fromWei(loanPosition.returnedWei))

  return borrowedEth - returnedEth
}
