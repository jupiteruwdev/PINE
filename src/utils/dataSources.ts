import fault from './fault'
import logger from './logger'

export type DataSource<P, R> = (params: P) => Promise<R>

export function composeDataSources<P, R>(...dataSources: DataSource<P, R>[]): (params: P) => Promise<R> {
  return async params => {
    const n = dataSources.length

    if (n === 0) throw Error('Minimum of 1 data source required for composition')

    for (let i = 0; i < n; i++) {
      const dataSource = dataSources[i]

      try {
        const res = await dataSource.apply(undefined, [params])
        return res
      }
      catch (err) {
        logger.warning('Fetching from data source... WARN')
        if (!logger.silent) console.warn(err)

        if (i + 1 < n) logger.info('Falling back to next data source...')
      }
    }

    throw fault('ERR_DATA_SOURCE_EXHAUSTED', 'Exhausted all data sources')
  }
}
