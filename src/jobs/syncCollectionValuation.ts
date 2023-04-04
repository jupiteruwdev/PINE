import { NextFunction, Request, Response } from 'express'
import _ from 'lodash'
import appConf from '../app.conf'
import { getEthNFTValuation } from '../controllers'
import { NFTCollectionModel } from '../db'
import { Blockchain, Valuation } from '../entities'
import logger from '../utils/logger'
import sleep from '../utils/sleep'

async function getAllCollections() {
  const collections = await NFTCollectionModel.find()
  return collections
}

export default async function syncCollectionValuation(req: Request, res: Response, next: NextFunction) {
  try {
    const collections = await getAllCollections()

    for (const collection of collections) {
      if (collection.networkType === 'ethereum') {
        const nftId = collection.matcher ? _.get(appConf.nftIds, collection.address ?? '', 0) : 0

        logger.info(`JOB_SYNC_COLLECTION_VALUATION: Updating valuation for collection ${collection.address} and nftId ${nftId}`)

        if (collection.address) {
          try {
            const blockchain = Blockchain.factory({
              network: collection.networkType,
              networkId: collection.networkId,
            }) as Blockchain<'ethereum'>

            const oldValuation = JSON.parse(JSON.stringify(collection.valuation?.value))

            const valuation = await getEthNFTValuation({ blockchain, collectionAddress: collection.address, nftId })
            collection.valuation = {
              ...Valuation.serialize(valuation),
              lastValue: oldValuation,
              timestamp: new Date().getTime(),
            }
            await collection.save()
          }
          catch (err) {
            logger.error(`JOB_SYNC_COLLECTION_VALUATION: Updating valuation for collection ${collection.address} and nftId ${nftId}... ERR:`, err)
          }
        }
        await sleep(1000)
      }
    }

    res.status(200).send()
  }
  catch (err) {
    logger.error('JOB_SYNC_COLLECTION_VALUATION: Handling runtime error... ERR:', err)
    next(err)
  }
}
