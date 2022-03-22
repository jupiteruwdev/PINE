import axios, { AxiosError } from 'axios'
import BigNumber from 'bignumber.js'
import Blockchain from '../entities/lib/Blockchain'
import PNPLTerms from '../entities/lib/PNPLTerms'
import { $WEI } from '../entities/lib/Value'
import failure from '../utils/failure'
import logger from '../utils/logger'
import getFlashLoanSourceContractAddress from './getFlashLoanSourceContractAddress'
import getLoanTerms from './getLoanTerms'
import getPoolContract from './getPoolContract'

type Params = {
  openseaVersion: 'main' | 'rinkeby'
  blockchain: Blockchain
  collectionId: string
  nftId: string
}

const openseaContractAddresses = {
  rinkeby: '0xdD54D660178B28f6033a953b0E55073cFA7e3744',
  main: '0x7f268357A8c2552623316e2562D90e642bB538E5',
}

const pnplContractAddresses: { [key: number]: any } = {
  4: '0x7D33BdDfe5945687382625547aBD8a0115B87490',
  1: '0xaD67300C087eC6c8Fb379671A418e77D79214beE',
}

export default async function getOpenseaPNPLTerms({ openseaVersion, blockchain, collectionId, nftId }: Params): Promise<PNPLTerms> {
  logger.info(`Fetching OpenSea PNPL terms for NFT ID <${ nftId }> and collection ID <${ collectionId }> on blockchain <${ JSON.stringify(blockchain) }>...`)

  switch (blockchain.network) {
  case 'ethereum': {
    const loanTerms = await getLoanTerms({ blockchain, collectionId, nftId })
    const poolContract = await getPoolContract({ blockchain, poolAddress: loanTerms.poolAddress })
    if ((poolContract.poolVersion || 0) < 2) throw failure('UNSUPPORTED_COLLECTION')
    const pnplContractAddress = pnplContractAddresses[Number(blockchain.networkId)]

    try {
      const { data: openseaInstructions } = await axios.get(`https://us-central1-pinedefi.cloudfunctions.net/opensea-purchase-generator?nft_address=${loanTerms.collection.address}&token_id=${nftId}&network_name=${openseaVersion}&account_address=${pnplContractAddress}`)
      const flashLoanSourceContractAddress = await getFlashLoanSourceContractAddress({ blockchain, poolAddress: loanTerms.poolAddress, flashLoanAmount: openseaInstructions.currentPrice })
      const pnplTerms: PNPLTerms = {
        ...loanTerms,
        flashLoanSourceContractAddress,
        listedPrice: $WEI(new BigNumber(openseaInstructions.currentPrice)),
        marketplaceContractAddress: openseaContractAddresses[openseaVersion],
        marketplaceName: 'OpenSea',
        pnplContractAddress,
        purchaseInstruction: openseaInstructions.calldata,
      }

      return pnplTerms
    }
    catch (error: any) {
      if ((error as AxiosError).response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        logger.error(`Failed to get OPenSea calldata ${JSON.stringify(error.response.data)}`)
        throw failure('FETCH_PNPL_TERMS_FAILURE', error.response.data.details)
      }
      throw error
    }
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
