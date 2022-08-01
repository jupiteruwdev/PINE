import _ from 'lodash'
import appConf from '../../../app.conf'
import { Blockchain, Collection, NFT } from '../../../entities'
import { DataSource } from '../../../utils/dataSources'
import fault from '../../../utils/fault'
import logger from '../../../utils/logger'
import rethrow from '../../../utils/rethrow'
import getRequest from '../../utils/getRequest'
import normalizeNFTImageUri from '../../utils/normalizeNFTImageUri'

type FetchNFTsParams = {
  blockchain: Blockchain
  ownerAddress: string
  populateMetadata: boolean
}

export const fetchEthNFTsByOwner: DataSource<FetchNFTsParams, NFT[]> = async ({ blockchain, ownerAddress, populateMetadata }) => {
  if (blockchain.network !== 'ethereum') throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')

  const apiKey = appConf.moralisAPIKey ?? rethrow('Missing Moralis API key')

  const { result: res } = await getRequest(`https://deep-index.moralis.io/api/v2/${ownerAddress}/nft`, {
    headers: {
      'X-API-Key': apiKey,
    },
    params: {
      chain: 'eth',
      format: 'decimal',
    },
  })

  if (!_.isArray(res)) throw fault('ERR_MORALIS_FETCH_NFTS_BY_OWNER', 'Bad request or unrecognized payload when fetching NFTs from Moralis API')

  const nfts = res.reduce<NFT[]>((prev, curr) => {
    const tokenId = _.get(curr, 'token_id')
    const collectionAddress = _.get(curr, 'token_address')

    if (tokenId === undefined || collectionAddress === undefined) {
      logger.warn(`Fetching NFTs by owner <${ownerAddress}> using Moralis API... dropping NFT ${JSON.stringify(curr)} due to missing address or token ID`)
      return prev
    }

    let metadata

    if (populateMetadata === true) {
      const parsed = JSON.parse(curr.metadata)
      const name = _.get(parsed, 'name') ?? `#${tokenId}`
      const imageUrl = _.get(parsed, 'image')

      metadata = {
        name,
        imageUrl: blockchain.networkId === Blockchain.Ethereum.Network.MAIN ? imageUrl : imageUrl ? normalizeNFTImageUri(imageUrl) : undefined,
      }
    }

    return [
      ...prev,
      NFT.factory({
        id: tokenId,
        collection: Collection.factory({
          address: collectionAddress,
          blockchain,
        }),
        ownerAddress,
        ...metadata ?? {},
      }),
    ]
  }, [])

  return nfts // .sort((a, b) => a.isSupported ? -1 : 1)
}
