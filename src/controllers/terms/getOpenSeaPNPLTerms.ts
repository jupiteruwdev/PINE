import BigNumber from 'bignumber.js'
import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, PNPLTerms, Value } from '../../entities'
import fault from '../../utils/fault'
import { getPoolContract } from '../contracts'
import getRequest from '../utils/getRequest'
import getFlashLoanSource from './getFlashLoanSource'
import getLoanTerms from './getLoanTerms'

type Params = {
  openseaVersion: 'main' | 'rinkeby'
  blockchain: Blockchain
  collectionAddresses: string[]
  nftIds: string[]
  poolAddresses?: string[]
}

export default async function getOpenSeaPNPLTerms({ openseaVersion, blockchain, collectionAddresses, poolAddresses, nftIds }: Params): Promise<PNPLTerms[]> {
  switch (blockchain.network) {
  case 'ethereum': {
    const loanTerms = await getLoanTerms({ blockchain, collectionAddresses, nftIds, poolAddresses })
    return Promise.all(loanTerms.map(async (term, index) => {
      const poolContract = await getPoolContract({ blockchain, poolAddress: term.poolAddress })
      if ((poolContract.poolVersion || 0) < 2) throw fault('ERR_PNPL_UNSUPPORTED_COLLECTION')
      const pnplContractAddress = _.get(appConf.pnplContractAddress, blockchain.networkId)

      try {
        const openseaInstructions = await getRequest('https://opensea-purchase-generator.herokuapp.com', {
          params: {
            'nft_address': term.collection.address,
            'token_id': nftIds[index],
            'network_name': openseaVersion,
            'account_address': pnplContractAddress,
          },
        })
        const flashLoanSource = await getFlashLoanSource({ blockchain, poolAddress: term.poolAddress })
        const pnplTerms: PNPLTerms = {
          ...term,
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
    }))
  }
  default:
    throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
  }
}
