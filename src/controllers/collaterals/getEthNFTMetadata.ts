import _ from 'lodash'
import ERC721EnumerableABI from '../../abis/ERC721Enumerable.json'
import appConf from '../../app.conf'
import { Blockchain, NFTMetadata } from '../../entities'
import { composeDataSources, DataSource } from '../../utils/dataSources'
import fault from '../../utils/fault'
import rethrow from '../../utils/rethrow'
import getEthWeb3 from '../utils/getEthWeb3'
import getRequest from '../utils/getRequest'
import normalizeIPFSUri from '../utils/normalizeIPFSUri'

type Params = {
  blockchain?: Blockchain
  collectionAddress?: string
  nftId?: string
  tokenUri?: string
}

/**
 * Fetches Ethereum NFT metadata using multiple strategies in the following order:
 *   1. If the `tokenUri` is provided, this method will directly query the `tokenUri` first. This is
 *      least expensive strategy.
 *   2. If `blockchain`, `collectionAddress` and `nftId` are provided, this method will query a
 *      known third-party data source.
 *   3. If #2 fails, this method will query the contract directly.
 *
 * @param param - See {@link params}.
 *
 * @returns The {@link NFTMetadata}. Note that this method never throws, so all properties are
 *          optional.
 */
export default async function getEthNFTMetadata({
  blockchain,
  collectionAddress,
  nftId,
  tokenUri,
}: Params): Promise<Partial<NFTMetadata>> {
  try {
    const metadata = await composeDataSources(
      useTokenUri({ tokenUri }),
      useAlchemy({ blockchain, collectionAddress, nftId }),
      useContract({ blockchain, collectionAddress, nftId }),
    )

    return metadata
  }
  catch (err) {
    return {}
  }
}

export function useAlchemy({ blockchain, collectionAddress, nftId }: Omit<Params, 'tokenUri'>): DataSource<Partial<NFTMetadata>> {
  return async () => {
    if (blockchain?.network !== 'ethereum') throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')

    const apiHost = _.get(appConf.alchemyAPIUrl, blockchain.networkId) ?? rethrow(`Missing Alchemy API URL for blockchain ${JSON.stringify(blockchain)}`)
    const apiKey = appConf.alchemyAPIKey ?? rethrow('Missing Alchemy API key')

    const res = await getRequest(`${apiHost}${apiKey}/getNFTMetadata`, {
      params: {
        contractAddress: collectionAddress,
        tokenId: nftId,
      },
    })

    const name = _.get(res, 'metadata.name')
    const imageUrl = ['media.0.gateway', 'metadata.image', 'metadata.image_url'].reduceRight((prev, curr) => !_.isEmpty(prev) ? prev : _.get(res, curr), '')

    if (_.isEmpty(name) || _.isEmpty(imageUrl)) {
      const tokenUri = _.get(res, 'tokenUri.gateway')
      const dataSource = useTokenUri({ tokenUri })
      return dataSource()
    }
    else {
      return {
        name,
        imageUrl: normalizeIPFSUri(imageUrl),
      }
    }
  }
}

export function useContract({ blockchain, collectionAddress, nftId }: Omit<Params, 'tokenUri'>): DataSource<Partial<NFTMetadata>> {
  return async () => {
    if (blockchain?.network !== 'ethereum') throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')

    const web3 = getEthWeb3(blockchain?.networkId)
    const contract = new web3.eth.Contract(ERC721EnumerableABI as any, collectionAddress)
    const tokenUri = await contract.methods.tokenURI(nftId).call()
    const dataSource = useTokenUri({ tokenUri })

    return dataSource()
  }
}

export function useTokenUri({ tokenUri }: Pick<Params, 'tokenUri'>): DataSource<Partial<NFTMetadata>> {
  return async () => {
    if (tokenUri === undefined) throw fault('ERR_FETCH_NFT_METADATA_BY_TOKEN_URI')

    let res: any

    if (tokenUri.indexOf('data:application/json;base64') > -1) {
      res = JSON.parse(atob(tokenUri.split(',')[1]))
    }
    else if (tokenUri.indexOf('data:application/json;utf8') > -1) {
      const firstComma = tokenUri.indexOf(',')
      res = JSON.parse(tokenUri.slice(firstComma + 1, tokenUri.length))
    }
    else {
      res = await getRequest(normalizeIPFSUri(tokenUri))
    }

    const name = _.get(res, 'name')
    const imageUrl = ['image', 'image_url'].reduceRight((prev, curr) => !_.isEmpty(prev) ? prev : _.get(res, curr), '')

    return {
      imageUrl: !_.isEmpty(imageUrl) ? normalizeIPFSUri(imageUrl) : undefined,
      name: !_.isEmpty(name) ? name : undefined,
    }
  }
}
