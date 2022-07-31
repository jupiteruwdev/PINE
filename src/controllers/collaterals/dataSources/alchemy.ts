import _ from 'lodash'
import appConf from '../../../app.conf'
import { Blockchain, Collection, NFT } from '../../../entities'
import { DataSource } from '../../../utils/dataSources'
import fault from '../../../utils/fault'
import logger from '../../../utils/logger'
import rethrow from '../../../utils/rethrow'
import getRequest from '../../utils/getRequest'
import normalizeNFTImageUri from '../../utils/normalizeNFTImageUri'

type Params = {
  blockchain: Blockchain
  ownerAddress: string
  populateMetadata: boolean
}

export const fetchEthNFTsByOwner: DataSource<Params, NFT[]> = async ({ blockchain, ownerAddress, populateMetadata }) => {
  if (blockchain.network !== 'ethereum') throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')

  const apiHost = _.get(appConf.alchemyAPIUrl, blockchain.networkId) ?? rethrow(`Missing Alchemy API URL for blockchain ${JSON.stringify(blockchain)}`)
  const apiKey = appConf.alchemyAPIKey ?? rethrow('Missing Alchemy API key')

  const { ownedNfts: res } = await getRequest(`${apiHost}${apiKey}/getNFTs`, {
    params: {
      owner: ownerAddress,
      withMetadata: populateMetadata,
    },
  })

  if (!_.isArray(res)) throw fault('ERR_ALCHEMY_FETCH_NFTS_BY_OWNER', 'Bad request or unrecognized payload when fetching NFTs from Alchemy API')

  const nfts = res.reduce<NFT[]>((prev, curr) => {
    const tokenId = parseInt(_.get(curr, 'id.tokenId'), 16)
    const collectionAddress = _.get(curr, 'contract.address')

    if (isNaN(tokenId) || collectionAddress === undefined) {
      logger.warning(`Fetching NFTs by owner <${ownerAddress}> using Alchemy API... dropping NFT ${JSON.stringify(curr)} due to missing address or token ID`)
      return prev
    }

    let metadata

    if (populateMetadata === true) {
      const name = _.get(curr, 'metadata.name') ?? `#${tokenId.toFixed()}`
      const imageUrl = _.get(curr, 'media.0.gateway') ?? _.get(curr, 'metadata.image')

      metadata = {
        name,
        imageUrl: blockchain.networkId === Blockchain.Ethereum.Network.MAIN ? imageUrl : imageUrl ? normalizeNFTImageUri(imageUrl) : undefined,
      }
    }

    return [
      ...prev,
      NFT.factory({
        id: tokenId.toFixed(),
        collection: Collection.factory({
          address: collectionAddress,
          blockchain,
        }),
        ...metadata ?? {},
      }),
    ]
  }, [])

  return nfts
}
