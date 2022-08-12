import BigNumber from 'bignumber.js'
import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, Collection, NFT } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import { getEthCollectionMetadata } from '../collections'
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

  const dataSource = DataSource.compose(
    useMoralis({ blockchain, ownerAddress, populateMetadata }),
    useAlchemy({ blockchain, ownerAddress, populateMetadata }),
  )

  let nfts = await dataSource.apply(undefined)

  logger.info(`Fetching Ethereum NFTs by owner <${ownerAddress}> on network <${blockchain.networkId}>... OK: ${nfts.length} result(s)`)

  if (populateMetadata === true) {
    const uniqCollectionAddresses = _.uniq(nfts.map(nft => nft.collection.address.toLowerCase()))
    const metadataArray = await Promise.all(uniqCollectionAddresses.map(async address => ({ [address]: await getEthCollectionMetadata({ blockchain, collectionAddress: address }) })))
    const collectionMetadataDict = metadataArray.reduce((prev, curr) => ({ ...prev, ...curr }), {})

    nfts = nfts.map(nft => {
      const collectionMetadata = collectionMetadataDict[nft.collection.address.toLowerCase()]

      return {
        ...nft,
        collection: {
          ...nft.collection,
          ...collectionMetadata ?? {},
        },
      }
    })

    return _.sortBy(nfts, [
      nft => nft.collection.isSupported !== true,
      nft => nft.collection.name?.toLowerCase(),
    ])
  }
  else {
    return _.sortBy(nfts, [
      nft => nft.collection.address.toLowerCase(),
    ])
  }
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
      })

      if (!_.isArray(partialRes)) rethrow('Bad request or unrecognized payload when fetching NFTs from Alchemy API')

      res.push(...partialRes)

      if (_.isNil(pageKey)) break

      currPageKey = pageKey
    }

    const unsanitizedNFTs = await Promise.all(res.map(async entry => {
      const tokenId = new BigNumber(_.get(entry, 'id.tokenId')).toFixed() // IDs from Alchemy are hex strings, convert to integer
      const collectionAddress = _.get(entry, 'contract.address')

      if (tokenId === 'NaN' || collectionAddress === undefined) {
        logger.warn(`Using Alchemy to look up NFTs for owner <${ownerAddress}>... WARN: Dropping NFT ${JSON.stringify(entry)} due to missing address or token ID`)
        return undefined
      }

      let metadata = {}

      if (populateMetadata === true) {
        const name = _.get(entry, 'metadata.name')
        const imageUrl = ['media.0.gateway', 'metadata.image', 'metadata.image_url'].reduceRight((prev, curr) => !_.isEmpty(prev) ? prev : _.get(entry, curr), '')

        if (_.isEmpty(name) && _.isEmpty(imageUrl)) {
          logger.warn(`Fetching metadata for NFT <${collectionAddress}/${tokenId}>... WARN: Unable to infer metadata from Alchemy, trying alternate data sources`)

          const tokenUri = _.get(entry, 'tokenUri.gateway')

          try {
            const dataSource = DataSource.compose(
              useTokenUri({ tokenUri }),
              useContract({ blockchain, collectionAddress, nftId: tokenId }),
            )

            metadata = await dataSource.apply(undefined)

            logger.info(`Fetching metadata for NFT <${collectionAddress}/${tokenId}>... OK:`, metadata)
          }
          catch (err) {
            logger.warn(`Fetching metadata for NFT <${collectionAddress}/${tokenId}>... WARN: Failed after exhausting all data sources`)
          }
        }
        else {
          metadata = {
            name,
            imageUrl: !_.isNil(imageUrl) ? normalizeIPFSUri(imageUrl) : undefined,
          }

          logger.info(`Fetching metadata for NFT <${collectionAddress}/${tokenId}>... OK:`, metadata)
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
      })

      res.push(...partialRes)

      if (_.isNil(cursor)) break
      if (!_.isArray(res)) rethrow('Bad request or unrecognized payload when fetching NFTs from Moralis API')

      currCursor = cursor
    }

    const unsanitizedNFTs = await Promise.all(res.map(async entry => {
      const tokenId = _.get(entry, 'token_id')
      const collectionAddress = _.get(entry, 'token_address')

      if (tokenId === undefined || collectionAddress === undefined) {
        logger.warn(`Using Moralis to look up NFTs for owner <${ownerAddress}>... WARN: dropping NFT ${JSON.stringify(entry)} due to missing address or token ID`)
        return undefined
      }

      let metadata = {}

      if (populateMetadata === true) {
        const parsed = JSON.parse(_.get(entry, 'metadata'))
        const name = _.get(parsed, 'name') ?? undefined
        const imageUrl = _.get(parsed, 'image') ?? undefined

        if (_.isEmpty(name) && _.isEmpty(imageUrl)) {
          logger.warn(`Fetching metadata for NFT <${collectionAddress}/${tokenId}>... WARN: Unable to infer metadata from Moralis, trying alternate data sources`)

          const tokenUri = _.get(entry, 'token_uri')

          try {
            const dataSource = DataSource.compose(
              useTokenUri({ tokenUri }),
              useContract({ blockchain, collectionAddress, nftId: tokenId }),
            )

            metadata = await dataSource.apply(undefined)

            logger.info(`Fetching metadata for NFT <${collectionAddress}/${tokenId}>... OK:`, metadata)
          }
          catch (err) {
            logger.warn(`Fetching metadata for NFT <${collectionAddress}/${tokenId}>... WARN: Failed after exhausting all data sources`)
          }
        }
        else {
          metadata = {
            name,
            imageUrl: !_.isNil(imageUrl) ? normalizeIPFSUri(imageUrl) : undefined,
          }

          logger.info(`Fetching metadata for NFT <${collectionAddress}/${tokenId}>... OK:`, metadata)
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
