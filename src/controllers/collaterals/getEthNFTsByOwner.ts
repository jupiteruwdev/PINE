import { Blockchain, NFT } from '../../entities'
import { composeDataSources } from '../../utils/dataSources'
import logger from '../../utils/logger'
import * as alchemy from './dataSources/alchemy'
import * as moralis from './dataSources/moralis'

type Params = {
  blockchain: Blockchain
  ownerAddress: string
  populateMetadata: boolean
}

export default async function getEthNFTsByOwner({ blockchain, ownerAddress, populateMetadata }: Params): Promise<NFT[]> {
  logger.info(`Fetching Ethereum NFTs by owner <${ownerAddress}> on network <${blockchain.networkId}>...`)

  const nfts = await composeDataSources(alchemy.fetchEthNFTsByOwner, moralis.fetchEthNFTsByOwner)({ blockchain, ownerAddress, populateMetadata })

  logger.info(`Fetching Ethereum NFTs by owner <${ownerAddress}> on network <${blockchain.networkId}>... OK: ${nfts.length} result(s)`)

  return nfts
}
