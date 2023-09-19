import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, Valuation, Value } from '../../entities'
import fault from '../../utils/fault'
import rethrow from '../../utils/rethrow'
import getRequest from './getRequest'
import postRequest from './postRequest'

type UseReservoirByTokenDetailsParams = {
  collectionAddress: string
  nftId?: string
  blockchain: Blockchain
  continuation?: string
}

type UseReservoirCollectionsParams = {
  collectionAddresses?: string[]
  name?: string
  blockchain: Blockchain
  continuation?: string
}

type UseReservoirSalesParams = {
  collectionAddress: string
  tokenId?: string | number
  blockchain: Blockchain
  continuation?: string
}

type UseReservoirCreateCollectionSetParams = {
  blockchain: Blockchain
  collectionAddresses: string[]
}

type UseReservoirUserTokensParams = {
  ownerAddress: string
  blockchain: Blockchain
  collectionSetId?: string
  continuation?: string
}

export async function useReservoirByTokenDetails({ collectionAddress, nftId, blockchain, continuation }: UseReservoirByTokenDetailsParams) {
  try {
    const apiKey = _.get(appConf.reservoirAPIKey, blockchain.networkId)
    const apiBaseUrl = _.get(appConf.reservoirAPIBaseUrl, blockchain.networkId)

    const res = await getRequest(`${apiBaseUrl}/tokens/v6`, {
      headers: {
        'x-api-key': apiKey,
      },
      params: {
        tokens: `${collectionAddress}:${nftId}`,
        continuation,
      },
    })

    if (!res.tokens?.length) rethrow(`Fetching token info for collection ${collectionAddress} and nftId ${nftId} failed`)

    const collectionId = _.get(res.tokens[0], 'token.collection.id')

    if (!collectionId) rethrow(`Extracting collection id for collection ${collectionAddress} and nftId ${nftId} failed`)

    const collectionInfo = await getRequest(`${apiBaseUrl}/collections/v6`, {
      headers: {
        'x-api-key': apiKey,
      },
      params: {
        id: collectionId,
      },
    })

    return collectionInfo
  }
  catch (err) {
    throw fault('ERR_USE_RESERVOIR_TOKEN_DETAILS', undefined, err)
  }
}

export async function useReservoirCollectionValuation({ collectionAddress, nftId, blockchain, continuation }: UseReservoirByTokenDetailsParams): Promise<Valuation> {
  try {
    const apiKey = _.get(appConf.reservoirAPIKey, blockchain.networkId)
    const apiBaseUrl = _.get(appConf.reservoirAPIBaseUrl, blockchain.networkId)
    let collectionInfo

    if (nftId) {
      collectionInfo = await useReservoirByTokenDetails({ collectionAddress, nftId, blockchain })
    }
    else {
      collectionInfo = await getRequest(`${apiBaseUrl}/collections/v6`, {
        headers: {
          'x-api-key': apiKey,
        },
        params: {
          contract: collectionAddress,
          continuation,
        },
      })
    }

    if (!collectionInfo.collections?.length) rethrow(`Fetching collection info for collection ${collectionAddress} and nftId ${nftId} failed`)

    const floorPrice = _.get(collectionInfo.collections[0], 'floorAsk.price.amount.native')

    if (!floorPrice) rethrow(`Extracting collection floor price for collection ${collectionAddress} and nftId ${nftId} failed`)

    const valuation = Valuation.factory({
      value: Value.$ETH(floorPrice),
    })

    return valuation
  }
  catch (err) {
    throw fault('ERR_USE_RESERVOIR_COLLECTION_VALUATION', undefined, err)
  }
}

export async function useReservoirCollections({ collectionAddresses, name, blockchain, continuation }: UseReservoirCollectionsParams): Promise<any> {
  try {
    const apiKey = _.get(appConf.reservoirAPIKey, blockchain.networkId)
    const apiBaseUrl = _.get(appConf.reservoirAPIBaseUrl, blockchain.networkId)

    const params: Record<string, any> = {}

    if (collectionAddresses) {
      params.contract = collectionAddresses
    }

    if (name) {
      params.name = name
    }

    if (continuation) {
      params.continuation = continuation
    }

    const collectionInfo = await getRequest(`${apiBaseUrl}/collections/v6`, {
      headers: {
        'x-api-key': apiKey,
      },
      params,
    })

    return collectionInfo
  }
  catch (err) {
    throw fault('ERR_USE_RESERVOIR_COLLECTIONS_VALUATION', undefined, err)
  }
}

export async function useReservoirSales({ collectionAddress, tokenId, blockchain, continuation }: UseReservoirSalesParams): Promise<any> {
  try {
    const apiKey = _.get(appConf.reservoirAPIKey, blockchain.networkId)
    const apiBaseUrl = _.get(appConf.reservoirAPIBaseUrl, blockchain.networkId)

    let params

    if (tokenId) {
      params = {
        tokens: `${collectionAddress}:${tokenId}`,
        continuation,
      }
    }
    else {
      params = {
        contract: collectionAddress,
        continuation,
      }
    }

    const salesInfo = await getRequest(`${apiBaseUrl}/sales/v6`, {
      headers: {
        'x-api-key': apiKey,
      },
      params,
    })

    return salesInfo
  }
  catch (err) {
    throw fault('ERR_USE_RESERVOIR_SALES', undefined, err)
  }
}

export async function useReservoirUserTokens({ ownerAddress, blockchain, collectionSetId, continuation }: UseReservoirUserTokensParams): Promise<any> {
  try {
    const apiKey = _.get(appConf.reservoirAPIKey, blockchain.networkId)
    const apiBaseUrl = _.get(appConf.reservoirAPIBaseUrl, blockchain.networkId)

    const tokens = await getRequest(`${apiBaseUrl}/users/${ownerAddress}/tokens/v7${collectionSetId ? `?collectionSetId=${collectionSetId}` : ''}`, {
      headers: {
        'x-api-key': apiKey,
      },
      params: {
        continuation,
      },
    })

    return tokens
  }
  catch (err) {
    throw fault('ERR_USE_RESERVOIR_USER_TOKENS', undefined, err)
  }
}

export async function useReservoirCreateCollectionSet({ collectionAddresses, blockchain }: UseReservoirCreateCollectionSetParams): Promise<string> {
  try {
    const apiKey = _.get(appConf.reservoirAPIKey, blockchain.networkId)
    const apiBaseUrl = _.get(appConf.reservoirAPIBaseUrl, blockchain.networkId)

    const response = await postRequest(`${apiBaseUrl}/collections-sets/v1`, {
      collections: collectionAddresses,
    }, {
      headers: {
        'x-api-key': apiKey,
      },
    })

    return response
  }
  catch (err) {
    throw fault('ERR_USE_RESERVOIR_CREATE_COLLECTION_SET', undefined, err)
  }
}
