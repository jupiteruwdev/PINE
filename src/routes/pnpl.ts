import { Router } from 'express'
import getOpenseaPNPLTerms from '../core/getOpenseaPNPLTerms'
import { findOne as findOneCollection } from '../db/collections'
import { EthBlockchain } from '../entities/lib/Blockchain'
import EthereumNetwork from '../entities/lib/EthereumNetwork'
import { serializePNPLTerms } from '../entities/lib/PNPLTerms'
import failure from '../utils/failure'
import web3 from 'web3'

const router = Router()

router.get('/terms', async (req, res, next) => {
  try {
    const url = req.query.url?.toString()
    if (!url) throw failure('INVALID_PARAMS')

    const parsedURL = new URL(url)

    const hostname = parsedURL.hostname

    let pnplTerms
    switch (hostname) {
    case 'opensea.io': {
      const [, , collectionAddress, nftId] = parsedURL.pathname.split('/')
      if (!web3.utils.isAddress(collectionAddress)) throw failure('INVALID_COLLECTION_ADDRESS')
      if (!collectionAddress || !nftId) throw failure('INVALID_PARAMS')
      

      const collection = await findOneCollection({ address: collectionAddress, blockchain: EthBlockchain(EthereumNetwork.MAIN) })
      if (!collection) throw failure('UNSUPPORTED_COLLECTION')

      pnplTerms = await getOpenseaPNPLTerms({
        openseaVersion: 'main',
        blockchain: EthBlockchain(EthereumNetwork.MAIN),
        collectionId: collection.id,
        nftId,
      })

      break
    }
    case 'testnets.opensea.io': {
      const [, , collectionAddress, nftId] = parsedURL.pathname.split('/')
      if (!collectionAddress || !nftId) throw failure('INVALID_PARAMS')
      if (!web3.utils.isAddress(collectionAddress)) throw failure('INVALID_PARAMS')

      const collection = await findOneCollection({ address: collectionAddress, blockchain: EthBlockchain(EthereumNetwork.RINKEBY) })
      if (!collection) throw failure('UNSUPPORTED_COLLECTION')

      pnplTerms = await getOpenseaPNPLTerms({
        openseaVersion: 'rinkeby',
        blockchain: EthBlockchain(EthereumNetwork.RINKEBY),
        collectionId: collection.id,
        nftId,
      })

      break
    }
    default:
      throw failure('INVALID_MARKETPLACE')
    }

    const payload = serializePNPLTerms(pnplTerms)
    res.status(200).json(payload)
  }
  catch (err) {
    next(err)
  }
})

export default router
