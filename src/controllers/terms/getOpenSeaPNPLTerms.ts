import BigNumber from 'bignumber.js'
import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, PNPLTerms, Value } from '../../entities'
import fault from '../../utils/fault'
import getRequest from '../../utils/getRequest'
import { getPoolContract } from '../contracts'
import getFlashLoanSource from './getFlashLoanSource'
import getLoanTerms from './getLoanTerms'

type Params = {
  openseaVersion: 'main' | 'rinkeby'
  blockchain: Blockchain
  collectionId: string
  nftId: string
}

export default async function getOpenSeaPNPLTerms({ openseaVersion, blockchain, collectionId, nftId }: Params): Promise<PNPLTerms> {
  switch (blockchain.network) {
  case 'ethereum': {
    const loanTerms = await getLoanTerms({ blockchain, collectionId, nftId })
    const poolContract = await getPoolContract({ blockchain, poolAddress: loanTerms.poolAddress })
    if ((poolContract.poolVersion || 0) < 2) throw fault('ERR_PNPL_UNSUPPORTED_COLLECTION')
    const pnplContractAddress = _.get(appConf.pnplContractAddress, blockchain.networkId)

    try {
      const openseaInstructions = await getRequest('https://us-central1-pinedefi.cloudfunctions.net/opensea-purchase-generator', {
        params: {
          'nft_address': loanTerms.collection.address,
          'token_id': nftId,
          'network_name': openseaVersion,
          'account_address': pnplContractAddress,
        },
      })
      const flashLoanSource = await getFlashLoanSource({ blockchain, poolAddress: loanTerms.poolAddress })
      const pnplTerms: PNPLTerms = {
        ...loanTerms,
        flashLoanSourceContractAddress: flashLoanSource.address,
        maxFlashLoanValue: flashLoanSource.capacity,
        listedPrice: Value.$WEI(new BigNumber(openseaInstructions.currentPrice)),
        marketplaceContractAddress: _.get(appConf.openseaContractAddress, blockchain.networkId),
        marketplaceName: 'OpenSea',
        pnplContractAddress,
        purchaseInstruction: openseaInstructions.calldata,
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
