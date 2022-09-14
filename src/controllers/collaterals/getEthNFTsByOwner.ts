import BigNumber from 'bignumber.js'
import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, Collection, NFT } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import { populateEthCollectionMetadataForNFTs } from '../collections'
import populatePoolAvailabilityForNFTs from '../pools/populatePoolAvailabilityForNFTs'
import DataSource from '../utils/DataSource'
import getRequest from '../utils/getRequest'
import normalizeIPFSUri from '../utils/normalizeIPFSUri'
import { useContract, useTokenUri } from './getEthNFTMetadata'

type Params = {
  blockchain: Blockchain
  ownerAddress: string
  populateMetadata: boolean
}

export default async function getEthNFTsByOwner({ blockchain, ownerAddress, populateMetadata }: Params): Promise<NFT[]> {
  if (blockchain.network !== 'ethereum') rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

  logger.info(`Fetching Ethereum NFTs by owner <${ownerAddress}> on network <${blockchain.networkId}>...`)

  let nfts = await DataSource.fetch(
    useAlchemy({ blockchain, ownerAddress, populateMetadata }),
    // useMoralis({ blockchain, ownerAddress, populateMetadata }),
  )

  logger.info(`Fetching Ethereum NFTs by owner <${ownerAddress}> on network <${blockchain.networkId}>... OK: ${nfts.length} result(s)`)

  if (populateMetadata === true) {
    nfts = await populateEthCollectionMetadataForNFTs({ blockchain, nfts })
  }

  const populatedNfts = await populatePoolAvailabilityForNFTs({ nfts, blockchain })

  return _.sortBy(populatedNfts, [
    nft => nft.hasPools !== true,
    nft => nft.collection.name?.toLowerCase(),
  ])
}

export function useAlchemy({ blockchain, ownerAddress, populateMetadata }: Params): DataSource<NFT[]> {
  return async () => {
    logger.info(`...using Alchemy to look up NFTs for owner <${ownerAddress}>`)

    if (blockchain.network !== 'ethereum') rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

    const apiHost = _.get(appConf.alchemyAPIUrl, blockchain.networkId) ?? rethrow(`Missing Alchemy API URL for blockchain ${JSON.stringify(blockchain)}`)
    const apiKey = appConf.alchemyAPIKey ?? rethrow('Missing Alchemy API key')
    const res = []

    let currPageKey

    while (true) {
      const { ownedNfts: partialRes, pageKey }: any = await getRequest(`${apiHost}${apiKey}/getNFTs`, {
        params: {
          owner: ownerAddress,
          withMetadata: populateMetadata,
          pageKey: currPageKey,
        },
      }).catch(err => rethrow(`Failed to fetch NFTs for owner <${ownerAddress}> using Alchemy: ${err}`))

      if (!_.isArray(partialRes)) rethrow('Bad request or unrecognized payload when fetching NFTs from Alchemy API')
      res.push(...partialRes)

      if (_.isNil(pageKey)) break
      currPageKey = pageKey
    }

    const unsanitizedNFTs = await Promise.all(res.map(async entry => {
      const tokenId = new BigNumber(_.get(entry, 'id.tokenId')).toFixed() // IDs from Alchemy are hex strings, convert to integer
      const collectionAddress = _.get(entry, 'contract.address')

      if (tokenId === 'NaN' || collectionAddress === undefined) {
        logger.warn(`...using Alchemy to look up NFTs for owner <${ownerAddress}>... WARN: Dropping NFT ${JSON.stringify(entry)} due to missing address or token ID`)
        return undefined
      }

      let metadata = {}

      if (populateMetadata === true) {
        logger.warn(`...inferring metadata for NFT <${collectionAddress}/${tokenId}>`)

        const name = _.get(entry, 'metadata.name')
        const imageUrl = ['media.0.gateway', 'metadata.image', 'metadata.image_url'].reduceRight((prev, curr) => !_.isEmpty(prev) ? prev : _.get(entry, curr), '')

        if (_.isEmpty(name) && _.isEmpty(imageUrl)) {
          const tokenUri = _.get(entry, 'tokenUri.gateway')

          try {
            metadata = await DataSource.fetch(
              useTokenUri({ tokenUri }),
              useContract({ blockchain, collectionAddress, nftId: tokenId }),
            )

            logger.info(`...fetching metadata for NFT <${collectionAddress}/${tokenId}>... OK`)
            logger.debug(JSON.stringify(metadata, undefined, 2))
          }
          catch (err) {
            logger.warn(`...fetching metadata for NFT <${collectionAddress}/${tokenId}>... WARN`)
            if (logger.isWarnEnabled() && !logger.silent) console.warn(err)
          }
        }
        else {
          metadata = {
            name,
            imageUrl: !_.isNil(imageUrl) ? normalizeIPFSUri(imageUrl) : undefined,
          }

          logger.info(`...fetching metadata for NFT <${collectionAddress}/${tokenId}>... OK`)
          logger.debug(JSON.stringify(metadata, undefined, 2))
        }
      }

      return NFT.factory({
        id: tokenId,
        collection: Collection.factory({
          address: collectionAddress,
          blockchain,
        }),
        ownerAddress,
        ...metadata,
      })
    }))

    const nfts = _.compact(unsanitizedNFTs)

    return nfts
  }
}

export function useMoralis({ blockchain, ownerAddress, populateMetadata }: Params): DataSource<NFT[]> {
  return async () => {
    logger.info(`...using Moralis to look up NFTs for owner <${ownerAddress}>`)
    if (blockchain.network !== 'ethereum') throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')

    const apiKey = appConf.moralisAPIKey ?? rethrow('Missing Moralis API key')
    const res = []

    let currCursor

    while (true) {
      const { result: partialRes, cursor }: any = await getRequest(`https://deep-index.moralis.io/api/v2/${ownerAddress}/nft`, {
        headers: {
          'X-API-Key': apiKey,
        },
        params: {
          chain: 'eth',
          format: 'decimal',
          cursor: currCursor,
        },
      }).catch(err => rethrow(`Failed to fetch NFTs for owner <${ownerAddress}> using Moralis: ${err}`))

      if (!_.isArray(partialRes)) rethrow('Bad request or unrecognized payload when fetching NFTs from Moralis API')
      res.push(...partialRes)

      if (_.isNil(cursor)) break
      currCursor = cursor
    }

    const unsanitizedNFTs = await Promise.all(res.map(async entry => {
      const tokenId = _.get(entry, 'token_id')
      const collectionAddress = _.get(entry, 'token_address')

      if (tokenId === undefined || collectionAddress === undefined) {
        logger.warn(`...using Moralis to look up NFTs for owner <${ownerAddress}>... WARN: dropping NFT ${JSON.stringify(entry)} due to missing address or token ID`)
        return undefined
      }

      let metadata = {}

      if (populateMetadata === true) {
        logger.warn(`...inferring metadata for NFT <${collectionAddress}/${tokenId}>`)

        const parsed = JSON.parse(_.get(entry, 'metadata'))
        const name = _.get(parsed, 'name') ?? undefined
        const imageUrl = _.get(parsed, 'image') ?? undefined

        if (_.isEmpty(name) && _.isEmpty(imageUrl)) {

          const tokenUri = _.get(entry, 'token_uri')

          try {
            metadata = await DataSource.fetch(
              useTokenUri({ tokenUri }),
              useContract({ blockchain, collectionAddress, nftId: tokenId }),
            )

            logger.info(`...fetching metadata for NFT <${collectionAddress}/${tokenId}>... OK`)
            logger.debug(metadata)
          }
          catch (err) {
            logger.warn(`...fetching metadata for NFT <${collectionAddress}/${tokenId}>... WARN`)
            if (logger.isWarnEnabled() && !logger.silent) console.warn(err)
          }
        }
        else {
          metadata = {
            name,
            imageUrl: !_.isNil(imageUrl) ? normalizeIPFSUri(imageUrl) : undefined,
          }

          logger.info(`...fetching metadata for NFT <${collectionAddress}/${tokenId}>... OK`)
          logger.debug(JSON.stringify(metadata, undefined, 2))
        }
      }

      return NFT.factory({
        id: tokenId,
        collection: Collection.factory({
          address: collectionAddress,
          blockchain,
        }),
        ownerAddress,
        ...metadata,
      })
    }))

    const nfts = _.compact(unsanitizedNFTs)

    return nfts
  }
}
