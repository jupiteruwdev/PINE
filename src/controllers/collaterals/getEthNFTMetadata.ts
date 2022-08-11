import _ from 'lodash'
import ERC721EnumerableABI from '../../abis/ERC721Enumerable.json' assert { type: 'json' }
import appConf from '../../app.conf'
import { Blockchain, NFTMetadata } from '../../entities'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import DataSource from '../utils/DataSource'
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
}: Params): Promise<NFTMetadata> {
  try {
    const dataSource = DataSource.compose(
      useTokenUri({ tokenUri }),
      useAlchemy({ blockchain, collectionAddress, nftId }),
      useContract({ blockchain, collectionAddress, nftId }),
    )

    const metadata = await dataSource.apply(undefined)

    return metadata
  }
  catch (err) {
    return {}
  }
}

export function useAlchemy({ blockchain, collectionAddress, nftId }: Omit<Params, 'tokenUri'>): DataSource<NFTMetadata> {
  return async () => {
    logger.info(`...using Alchemy to look up metadata for NFT <${collectionAddress}/${nftId}}>`)

    if (blockchain?.network !== 'ethereum') rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

    const apiHost = _.get(appConf.alchemyAPIUrl, blockchain.networkId) ?? rethrow(`Missing Alchemy API URL for blockchain <${JSON.stringify(blockchain)}>`)
    const apiKey = appConf.alchemyAPIKey ?? rethrow('Missing Alchemy API key')

    const res = await getRequest(`${apiHost}${apiKey}/getNFTMetadata`, {
      params: {
        contractAddress: collectionAddress,
        tokenId: nftId,
      },
    })

    const name = _.get(res, 'metadata.name')
    const imageUrl = ['media.0.gateway', 'metadata.image', 'metadata.image_url'].reduceRight((prev, curr) => !_.isEmpty(prev) ? prev : _.get(res, curr), '')

    if (_.isEmpty(name) && _.isEmpty(imageUrl)) {
      const tokenUri = _.get(res, 'tokenUri.gateway')
      const dataSource = useTokenUri({ tokenUri })
      const metadata = await dataSource.apply(undefined)

      return metadata
    }
    else {
      return {
        imageUrl: normalizeIPFSUri(imageUrl),
        name,
      }
    }
  }
}

export function useContract({ blockchain, collectionAddress, nftId }: Omit<Params, 'tokenUri'>): DataSource<NFTMetadata> {
  return async () => {
    logger.info(`...using contract to look up metadata for NFT <${collectionAddress}/${nftId}}>`)

    if (blockchain?.network !== 'ethereum') rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

    const web3 = getEthWeb3(blockchain.networkId)
    const contract = new web3.eth.Contract(ERC721EnumerableABI as any, collectionAddress)
    const tokenUri = await contract.methods.tokenURI(nftId).call()
    const dataSource = useTokenUri({ tokenUri })

    return dataSource.apply(undefined).catch(err => rethrow(`No name and image URL found in metadata for contract <${collectionAddress}/${nftId}}>`))
  }
}

export function useTokenUri({ tokenUri }: Pick<Params, 'tokenUri'>): DataSource<NFTMetadata> {
  return async () => {
    logger.info(`...using token URI <${tokenUri}> to look up metadata for NFT`)

    if (tokenUri === undefined) rethrow(`Failed to fetch NFT metadata from token URI <${tokenUri}>`)

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

    if (_.isEmpty(name) && _.isEmpty(imageUrl)) rethrow(`No name and image URL found in metadata for token URI <${tokenUri}>`)

    const metadata = {
      imageUrl: !_.isNil(imageUrl) ? normalizeIPFSUri(imageUrl) : undefined,
      name,
    }

    return metadata
  }
}
