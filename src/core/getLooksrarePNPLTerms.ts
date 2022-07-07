import BigNumber from 'bignumber.js'
import _ from 'lodash'
import appConf from '../app.conf'
import { Blockchain, PNPLTerms, Value } from '../entities'
import fault from '../utils/fault'
import getRequest from '../utils/getRequest'
import getFlashLoanSource from './getFlashLoanSource'
import getLoanTerms from './getLoanTerms'
import getPoolContract from './getPoolContract'

type Params = {
  blockchain: Blockchain
  collectionAddress: string
  nftId: string
}

export default async function getLooksrarePNPLTerms({ blockchain, collectionAddress, nftId }: Params): Promise<PNPLTerms> {
  switch (blockchain.network) {
  case 'ethereum': {
    const loanTerms = await getLoanTerms({ blockchain, collectionAddress, nftId })
    const poolContract = await getPoolContract({ blockchain, poolAddress: loanTerms.poolAddress })
    if ((poolContract.poolVersion || 0) < 2) throw fault('ERR_PNPL_UNSUPPORTED_COLLECTION')
    const pnplContractAddress = _.get(appConf.pnplContractAddress, blockchain.networkId)

    try {
      const lookrareInstructions = await getRequest('https://northamerica-northeast1-pinedefi.cloudfunctions.net/looksrare-purchase-generator', {
        params: {
          'nft_address': loanTerms.collection.address,
          'token_id': nftId,
          'network_id': blockchain.networkId,
          'account_address': pnplContractAddress,
        },
      })
      const flashLoanSource = await getFlashLoanSource({ blockchain, poolAddress: loanTerms.poolAddress })
      const pnplTerms: PNPLTerms = {
        ...loanTerms,
        flashLoanSourceContractAddress: flashLoanSource.address,
        maxFlashLoanValue: flashLoanSource.capacity,
        listedPrice: Value.$WEI(new BigNumber(lookrareInstructions.currentPrice)),
        marketplaceContractAddress: _.get(appConf.looksrareContractAddress, blockchain.networkId),
        marketplaceName: 'Looksrare',
        pnplContractAddress,
        purchaseInstruction: lookrareInstructions.calldata,
      }

      return pnplTerms
    }
    catch (err) {
      throw fault('ERR_FETCH_PNPL_TERMS', undefined, err)
    }
  }
  default:
    throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
  }
}
