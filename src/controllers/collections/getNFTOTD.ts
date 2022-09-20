import appConf from '../../app.conf'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import DataSource from '../utils/DataSource'
import getRequest from '../utils/getRequest'

export default async function getNFTOTD(): Promise<string> {
  logger.info('Fetching NFT of the Day...')

  const collectionName = await DataSource.fetch(
    useLunarCrush(),
  )

  logger.info(`Fetching NFT of the Day... OK: ${collectionName}`)

  return collectionName
}

export function useLunarCrush(): DataSource<string> {
  return async () => {
    const apiHost = 'https://lunarcrush.com/api3/'
    const apiKey = appConf.lunarCrushAPIKey ?? rethrow('Missing LunarCrush API key')

    const { name: collectionName } = await getRequest(`${apiHost}/nftoftheday`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    }).catch(err => rethrow(`Failed to fetch NFT of the Day using LunarCrush: ${err}`))

    return collectionName
  }
}
