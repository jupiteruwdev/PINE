import { supportedCollections } from '../config/supportedCollecitons'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import LoanOption from '../entities/LoanOption'
import { parseEthNetworkId } from '../utils/ethereum'

type Params = {
  poolAddress: string
}

export default function getPoolLoanOptions({ poolAddress }: Params, blockchain: Blockchain = EthBlockchain()): LoanOption[] {
  const rawData = supportedCollections

  switch (blockchain.network) {
  case 'ethereum': {
    const collectionIds = Object.keys(rawData).filter(collectionId => parseEthNetworkId(rawData[collectionId].networkId) === blockchain.networkId)

    for (const collectionId of collectionIds) {
      const collectionData = rawData[collectionId]

      if (poolAddress === collectionData.lendingPool.address) {
        return collectionData.lendingPool.loan_options.map((loanOption: any) => ({
          ...loanOption,
          'interest_bps_per_block_override': loanOption.interest_bps_block_override,
          'interest_bps_per_block': loanOption.interest_bps_block,
          'loan_duration_seconds': loanOption.loan_duration_second,
        }))
      }
    }

    break
  }
  }

  return []
}
