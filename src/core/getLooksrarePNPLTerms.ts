import BigNumber from 'bignumber.js'
import Blockchain from '../entities/lib/Blockchain'
import PNPLTerms from '../entities/lib/PNPLTerms'
import { $WEI } from '../entities/lib/Value'
import failure from '../utils/failure'
import getRequest from '../utils/getRequest'
import logger from '../utils/logger'
import getFlashLoanSource from './getFlashLoanSource'
import getLoanTerms from './getLoanTerms'
import getPoolContract from './getPoolContract'

type Params = {
  blockchain: Blockchain
  collectionId: string
  nftId: string
}

const looksrareContractAddresses: { [key: number]: any } = {
  4: '0x1AA777972073Ff66DCFDeD85749bDD555C0665dA',
  1: '0x59728544B08AB483533076417FbBB2fD0B17CE3a',
}

const pnplContractAddresses: { [key: number]: any } = {
  4: '0x7D33BdDfe5945687382625547aBD8a0115B87490',
  1: '0x8C53B4e230A9C74F86B24E209364Af67d48c947a',
}

export default async function getLooksrarePNPLTerms({ blockchain, collectionId, nftId }: Params): Promise<PNPLTerms> {
  logger.info(`Fetching Looksrare PNPL terms for NFT ID <${ nftId }> and collection ID <${ collectionId }> on blockchain <${ JSON.stringify(blockchain) }>...`)

  switch (blockchain.network) {
  case 'ethereum': {
    const loanTerms = await getLoanTerms({ blockchain, collectionId, nftId })
    const poolContract = await getPoolContract({ blockchain, poolAddress: loanTerms.poolAddress })
    if ((poolContract.poolVersion || 0) < 2) throw failure('UNSUPPORTED_COLLECTION')
    const pnplContractAddress = pnplContractAddresses[Number(blockchain.networkId)]

    try {
      const lookrareInstructions = await getRequest('https://northamerica-northeast1-pinedefi.cloudfunctions.net/looksrare-purchase-generator', {
        params: {
          'nft_address': loanTerms.collection.address,
          'token_id': nftId,
          'network_id': blockchain.networkId,
          'account_address': pnplContractAddress,
        },
      })
      const flashLoanSource = await getFlashLoanSource({ blockchain, poolAddress: loanTerms.poolAddress, flashLoanAmount: lookrareInstructions.currentPrice })
      const pnplTerms: PNPLTerms = {
        ...loanTerms,
        flashLoanSourceContractAddress: flashLoanSource.address,
        maxFlashLoanValue: flashLoanSource.capacity,
        listedPrice: $WEI(new BigNumber(lookrareInstructions.currentPrice)),
        marketplaceContractAddress: looksrareContractAddresses[Number(blockchain.networkId)],
        marketplaceName: 'Looksrare',
        pnplContractAddress,
        purchaseInstruction: lookrareInstructions.calldata,
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