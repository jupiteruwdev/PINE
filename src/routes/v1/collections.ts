import { Router } from 'express'
import _ from 'lodash'
import { getEthCollectionFloorPrices, getEthNFTValuation, getNFTOTD, searchCollections } from '../../controllers'
import { Blockchain, Collection, serializeEntityArray, Value } from '../../entities'
import fault from '../../utils/fault'
import { getBlockchain, getBlockchainFilter, getString } from '../utils/query'

const router = Router()

router.get('/search', async (req, res, next) => {
  try {
    const blockchain = getBlockchain(req.query)
    const query = getString(req.query, 'query')
    const collections = await searchCollections({ blockchain, query })
    const payload = serializeEntityArray(collections, Collection.codingResolver)
    res.status(200).json(payload)
  }
  catch (err) {
    next(fault('ERR_API_SEARCH_COLLECTIONS', undefined, err))
  }
})

router.get('/floors', async (req, res, next) => {
  try {
    const collectionAddresses = req.query.collectionAddresses
    if (!collectionAddresses) return res.status(200).json([])
    if (!_.isArray(collectionAddresses)) throw fault('ERR_INVALID_COLLECTION_ADDRESSES')
    if (!((c: any): c is string[] => _.every(c, (e: any) => _.isString(e)))(collectionAddresses)) throw fault('ERR_INVALID_COLLECTION_ADDRESSES')

    const blockchainFilter = getBlockchainFilter(req.query, false)
    const prices = await getEthCollectionFloorPrices({ blockchain: Blockchain.Ethereum(blockchainFilter.ethereum), collectionAddresses })
    const payload = serializeEntityArray(prices, Value.codingResolver)

    res.status(200).json(payload)
  }
  catch (err) {
    next(fault('ERR_API_FETCH_FLOOR_PRICES', undefined, err))
  }
})

router.get('/nftoftheday', async (req, res, next) => {
  try {
    const collectionName = await getNFTOTD()

    res.status(200).json(collectionName)
  }
  catch (err) {
    next(fault('ERR_API_FETCH_NFT_OF_THE_DAY', undefined, err))
  }
})

router.get('/valuation', async (req, res, next) => {
  try {
    const blockchain = getBlockchain(req.query) as Blockchain<'ethereum'>
    const collectionAddress = getString(req.query, 'collectionAddress')
    const nftId = getString(req.query, 'nftId')

    const valuation = await getEthNFTValuation({ blockchain, collectionAddress, nftId })

    res.status(200).json({ valuation })
  }
  catch (err) {
    next(fault('ERR_API_FETCH_VALUATION', undefined, err))
  }
})

export default router