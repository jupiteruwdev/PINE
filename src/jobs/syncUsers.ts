import _ from 'lodash'
import appConf from '../app.conf'
import getRequest from '../controllers/utils/getRequest'
import { UserModel, initDb } from '../database'
import fault from '../utils/fault'
import logger from '../utils/logger'
import sleep from '../utils/sleep'

async function getAllUsers() {
  const users = await UserModel.find({
    networkType: 'ethereum',
    networkId: 1,
  })

  return users
}

const interactionContractAddresses = [
  '0x3B968D2D299B895A5Fcf3BBa7A64ad0F566e6F88',
]

export default async function syncUsers() {
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
    const users = await getAllUsers()

    for (const address of interactionContractAddresses) {
      logger.info(`JOB_SYNC_USERS: Fetching transactions for contract<${address}>`)
      try {
        let cursor
        let txs: any[] = []; let page = 0
        do {
          try {
            logger.info(`JOB_SYNC_USERS: Fetching transactions for contract<${address}> for page <${page}>`)
            const res: any = await getRequest(`https://deep-index.moralis.io/api/v2/${address}`, {
              params: {
                'chain': 'eth',
                cursor,
              },
              headers: {
                'X-API-KEY': appConf.moralisAPIKey,
              },
            })
            cursor = _.get(res, 'cursor', '')
            txs = [...txs, ..._.get(res, 'result', [])]
            logger.info(`JOB_SYNC_USERS: Fetching transactions for contract<${address}> for page <${page}>... OK`)
          }
          catch (err) {
            logger.error(`JOB_SYNC_USERS: Fetching transactions for contract<${address}> for page <${page}>... ERR:`, err)
            process.exit(1)
          }
          page++
        } while (!!cursor)

        for (const user of users) {
          const isInteracted = txs.find((tx: any) =>
            _.get(tx, 'from_address', '').toLowerCase() === user.address?.toLowerCase()
          )
          if (isInteracted) {
            user.interactionAddresses = [
              ...user.interactionAddresses,
              address.toLowerCase(),
            ]
          }
        }
        sleep(1000)
      }
      catch (err) {
        logger.error(`JOB_SYNC_USERS: Fetching transactions for contract <${address}>... ERR:`, err)
        process.exit(1)
      }
    }

    for (const user of users) {
      if (user.isModified()) {
        await user.save()
      }
    }
  }
  catch (err) {
    logger.error('JOB_SYNC_USERS: Handling runtime error... ERR:')
    process.exit(1)
  }
}

syncUsers().catch(err => {
  console.error(err)
  process.exit(1) // Retry Job Task by exiting the process
})
