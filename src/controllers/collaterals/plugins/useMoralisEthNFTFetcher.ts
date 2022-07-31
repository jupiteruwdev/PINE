import _ from 'lodash'
import appConf from '../../../app.conf'
import { Blockchain, Collection, NFT } from '../../../entities'
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

export default async function useMoralisEthNFTFetcher({ blockchain, ownerAddress, populateMetadata }: Params): Promise<NFT[]> {
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

  const nfts = _.compact(await Promise.all(res.map(async (t: any) => {
    const tokenId = _.get(t, 'token_id')
    const collectionAddress = _.get(t, 'token_address')

    if (tokenId === undefined || collectionAddress === undefined) {
      logger.warning(`Fetching NFTs by owner <${ownerAddress}> using Moralis API... dropping NFT ${JSON.stringify(t)} due to missing address or token ID`)
      return undefined
    }

    let metadata

    if (populateMetadata === true) {
      const parsed = JSON.parse(t.metadata)
      const name = _.get(parsed, 'name') ?? `#${tokenId}`
      const imageUrl = _.get(parsed, 'image')

      metadata = {
        name,
        imageUrl: imageUrl ? normalizeNFTImageUri(imageUrl) : undefined,
      }
    }

    return NFT.factory({
      id: tokenId,
      collection: Collection.factory({
        address: collectionAddress,
        blockchain,
      }),
      ...metadata ?? {},
    })
  })))

  return nfts // .sort((a, b) => a.isSupported ? -1 : 1)
}
