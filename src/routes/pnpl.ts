import { Router } from 'express'
import { supportedCollections } from '../config/supportedCollections'
import getOpenseaPNPLTerms from '../core/getOpenseaPNPLTerms'
import { EthBlockchain } from '../entities/lib/Blockchain'
import { serializePNPLTerms } from '../entities/lib/PNPLTerms'
import { parseEthNetworkId } from '../utils/ethereum'
import failure from '../utils/failure'

const router = Router()

router.get('/terms', async (req, res, next) => {
  try {
    const url = req.query.url?.toString()
    if (!url) throw failure('INVALID_PARAMS')
    const parsedURL = new URL(url)

    const hostname = parsedURL.hostname
    const [, , collectionAddress, nftId] = parsedURL.pathname.split('/')

    let collectionId = ''
    const collection = Object.keys(supportedCollections).find(e => {
      const pred = supportedCollections[e].address === collectionAddress
      if (pred) collectionId = e
      return pred
    })
    if (!collection) throw failure('UNSUPPORTED_COLLECTION')

    let pnplTerms
    switch (hostname) {
    case 'opensea.io':
      pnplTerms = await getOpenseaPNPLTerms({
        openseaVersion: 'main',
        blockchain: EthBlockchain(parseEthNetworkId(1)),
        collectionId,
        nftId,
      })
      break
    case 'testnets.opensea.io':
      pnplTerms = await getOpenseaPNPLTerms({
        openseaVersion: 'rinkeby',
        blockchain: EthBlockchain(parseEthNetworkId(4)),
        collectionId,
        nftId,
      })
      break
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
