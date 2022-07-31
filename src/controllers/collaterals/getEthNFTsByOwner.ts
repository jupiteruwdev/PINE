import { Blockchain, NFT } from '../../entities'
import logger from '../../utils/logger'
import useAlchemyEthNFTFetcher from './plugins/useAlchemyEthNFTFetcher'
import useMoralisEthNFTFetcher from './plugins/useMoralisEthNFTFetcher'

type Params = {
  blockchain: Blockchain
  ownerAddress: string
  populateMetadata: boolean
}

export default async function getEthNFTsByOwner({ blockchain, ownerAddress, populateMetadata }: Params): Promise<NFT[]> {
  logger.info(`Fetching Ethereum NFTs by owner <${ownerAddress}> on network <${blockchain.networkId}>...`)

  let nfts

  try {
    nfts = await useMoralisEthNFTFetcher({ blockchain, ownerAddress, populateMetadata })
  }
  catch (err) {
    logger.warning(`Fetching Ethereum NFTs by owner <${ownerAddress}> on network <${blockchain.networkId}>... WARN: Fetch attempt failed on Moralis, falling back to Alchemy`)
    nfts = await useAlchemyEthNFTFetcher({ blockchain, ownerAddress, populateMetadata })
  }

  logger.info(`Fetching Ethereum NFTs by owner <${ownerAddress}> on network <${blockchain.networkId}>... OK: ${nfts.length} result(s)`)

  return nfts
}
