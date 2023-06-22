import appConf from '../../app.conf'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import DataSource from '../utils/DataSource'
import getRequest from '../utils/getRequest'

export default async function getNFTOTD(): Promise<string> {
  try {
    logger.info('Fetching NFT of the Day...')

    const collectionName = await DataSource.fetch(
      useLunarCrush(),
    )

    logger.info(`Fetching NFT of the Day... OK: ${collectionName}`)

    return collectionName
  }
  catch (err) {
    throw fault('ERR_GET_NFT_OTD', undefined, err)
  }
}

export function useLunarCrush(): DataSource<string> {
  return async () => {
    try {
      const apiHost = 'https://lunarcrush.com/api3/'
      const apiKey = appConf.lunarCrushAPIKey ?? rethrow('Missing LunarCrush API key')

      const { name: collectionName } = await getRequest(`${apiHost}/nftoftheday`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }).catch(err => rethrow(`Failed to fetch NFT of the Day using LunarCrush: ${err}`))

      return collectionName
    }
    catch (err) {
      throw fault('ERR_GET_NFT_OTD_USE_LUNAR_CRUSH', undefined, err)
    }
  }
}
