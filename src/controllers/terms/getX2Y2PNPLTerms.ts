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
  blockchain: Blockchain
  collectionAddresses: string[]
  nftIds: string[]
  poolAddresses?: string[]
}

export default async function getX2Y2PNPLTerms({ blockchain, collectionAddresses, nftIds, poolAddresses }: Params): Promise<PNPLTerms[]> {
  try {
    switch (blockchain.network) {
    case 'ethereum': {
      const loanTerms = await getLoanTerms({ blockchain, collectionAddresses, nftIds, poolAddresses })
      return Promise.all(loanTerms.map(async (term, index) => {
        const poolContract = await getPoolContract({ blockchain, poolAddress: term.poolAddress })
        if ((poolContract.poolVersion || 0) < 2) throw fault('ERR_PNPL_UNSUPPORTED_COLLECTION')
        const pnplContractAddress = _.get(appConf.pnplContractAddress, blockchain.networkId)

        try {
          const x2y2Instructions = await getRequest('https://northamerica-northeast1-pinedefi.cloudfunctions.net/looksrare-purchase-generator', {
            params: {
              'nft_address': term.collection.address,
              'token_id': term.nft.id,
              'network_id': blockchain.networkId,
              'account_address': pnplContractAddress,
              'marketplace': 'x2y2',
            },
          })
          const flashLoanSource = await getFlashLoanSource({ blockchain, poolAddress: term.poolAddress })
          const pnplTerms: PNPLTerms = {
            ...term,
            flashLoanSourceContractAddress: flashLoanSource.address,
            maxFlashLoanValue: flashLoanSource.capacity,
            listedPrice: Value.$WEI(new BigNumber(x2y2Instructions.currentPrice)),
            marketplaceContractAddress: _.get(appConf.x2y2ContractAddress, blockchain.networkId),
            marketplaceName: 'X2y2',
            pnplContractAddress,
            purchaseInstruction: x2y2Instructions.calldata,
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
  catch (err) {
    throw fault('ERR_GET_X2Y2_PNPL_TERMS', undefined, err)
  }
}
