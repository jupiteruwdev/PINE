import _ from 'lodash'
import appConf from '../app.conf'
import { getCollectionValuation } from '../controllers/valuations'
import { NFTCollectionModel, initDb } from '../database'
import { Blockchain, Valuation } from '../entities'
import fault from '../utils/fault'
import logger from '../utils/logger'
import sleep from '../utils/sleep'

async function getAllCollections() {
  const collections = await NFTCollectionModel.find({
    verified: true,
  })
  return collections
}

export default async function syncCollectionValuation() {
  try {
    await initDb({
      onError: err => {
        logger.error('Establishing database conection... ERR:', err)
        throw fault('ERR_DB_CONNECTION', undefined, err)
      },
      onOpen: () => {
        logger.info('Establishing database connection... OK')
      },
    })
    const collections = await getAllCollections()

    for (const collection of collections) {
      const blockchain = Blockchain.factory({
        network: collection.networkType,
        networkId: collection.networkId,
      }) as Blockchain
      if (Blockchain.isEVMChain(blockchain)) {
        const nftId: string | number = collection.matcher ? _.get(appConf.nftIds, collection.address ?? '', 0) : 0

        logger.info(`JOB_SYNC_COLLECTION_VALUATION Updating valuation for collection ${collection.address} and nftId ${nftId}`)

        if (collection.address) {
          try {
            const oldValuation = JSON.parse(JSON.stringify(collection.toObject().valuation?.value || {}))

            const valuation = await getCollectionValuation({ blockchain, collectionAddress: collection.address, nftId: nftId ? nftId.toString() : undefined })
            collection.valuation = {
              ...Valuation.serialize(valuation),
              lastValue: oldValuation,
              timestamp: new Date().getTime(),
            }
            await collection.save()
          }
          catch (err) {
            logger.error(`JOB_SYNC_COLLECTION_VALUATION Updating valuation for collection ${collection.address} and nftId ${nftId}... ERR:`, err)
          }
        }
        await sleep(1000)
      }
    }
  }
  catch (err) {
    logger.error('JOB_SYNC_COLLECTION_VALUATION: Handling runtime error... ERR:', err)
    process.exit(1)
  }
}

syncCollectionValuation()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1) // Retry Job Task by exiting the process
  })
