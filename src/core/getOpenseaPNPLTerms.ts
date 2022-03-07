import Blockchain from '../entities/lib/Blockchain'
import PNPLTerms from '../entities/lib/PNPLTerms'
import failure from '../utils/failure'
import logger from '../utils/logger'
import getLoanTerms from './getLoanTerms'
import axios, { AxiosError } from 'axios'

type Params = {
  openseaVersion: 'main' | 'rinkeby'
  blockchain: Blockchain
  collectionId: string
  nftId: string
}

const openseaContractAddresses = {
  rinkeby: '0xdD54D660178B28f6033a953b0E55073cFA7e3744',
  main: '0x7Be8076f4EA4A4AD08075C2508e481d6C946D12b',
}

const flashLoanSourceContractAddresses: { [key: number]: any } = {
  4: '0x8eE816b1B3B3E5F2dE1d8344A7Dc69AA16074314',
  // TODO: add mainnet flashloan contract
}

export default async function getOpenseaPNPLTerms({ openseaVersion, blockchain, collectionId, nftId }: Params): Promise<PNPLTerms> {
  logger.info(`Fetching loan terms for NFT ID <${ nftId }> and collection ID <${ collectionId }> on blockchain <${ JSON.stringify(blockchain) }>...`)

  switch (blockchain.network) {
  case 'ethereum': {
    const loanTerms = await getLoanTerms({ blockchain, collectionId, nftId })
    const flashLoanSourceContractAddress = flashLoanSourceContractAddresses[Number(blockchain.networkId)]
    try {
      const { data: openseaInstructions } = await axios.get(`https://us-central1-pinedefi.cloudfunctions.net/opensea-purchase-generator?nft_address=${loanTerms.collection.address}&token_id=${nftId}&network_name=${openseaVersion}&account_address=${flashLoanSourceContractAddress}`)
      const pnplTerms: PNPLTerms = {
        ...loanTerms,
        purchaseInstruction: openseaInstructions.calldata,
        listedPrice: openseaInstructions.currentPrice,
        flashLoanSourceContractAddress,
        marketplaceContractAddress: openseaContractAddresses[openseaVersion],
      }
      return pnplTerms
    }
    catch (error: any) {
      if ((error as AxiosError).response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        logger.error(`Failed to get opensea calldata ${JSON.stringify(error.response.data)}`)
        throw failure(error.response.data.error, error.response.data.details)
      }
    }
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
