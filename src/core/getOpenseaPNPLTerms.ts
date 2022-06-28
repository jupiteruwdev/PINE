import BigNumber from 'bignumber.js'
import _ from 'lodash'
import appConf from '../app.conf'
import { Value, Blockchain, PNPLTerms } from '../entities'
import failure from '../utils/failure'
import getRequest from '../utils/getRequest'
import logger from '../utils/logger'
import getFlashLoanSource from './getFlashLoanSource'
import getLoanTerms from './getLoanTerms'
import getPoolContract from './getPoolContract'

type Params = {
  openseaVersion: 'main' | 'rinkeby'
  blockchain: Blockchain
  collectionId: string
  nftId: string
}

export default async function getOpenseaPNPLTerms({ openseaVersion, blockchain, collectionId, nftId }: Params): Promise<PNPLTerms> {
  logger.info(`Fetching OpenSea PNPL terms for NFT ID <${ nftId }> and collection ID <${ collectionId }> on blockchain <${ JSON.stringify(blockchain) }>...`)

  switch (blockchain.network) {
  case 'ethereum': {
    const loanTerms = await getLoanTerms({ blockchain, collectionId, nftId })
    const poolContract = await getPoolContract({ blockchain, poolAddress: loanTerms.poolAddress })
    if ((poolContract.poolVersion || 0) < 2) throw failure('UNSUPPORTED_COLLECTION')
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
      throw failure('FETCH_PNPL_TERMS_FAILURE', err)
    }
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
