import _ from 'lodash'
import rethrow from './rethrow'

export type DataSource<R> = () => Promise<R>

export async function composeDataSources<R>(...dataSources: DataSource<R>[]): Promise<R> {
  const n = dataSources.length

  if (n === 0) rethrow('Minimum of 1 data source required for composition')

  for (let i = 0; i < n; i++) {
    const dataSource = dataSources[i]

    try {
      const res = await dataSource.apply(undefined)
      if (!_.isEmpty(res)) return res
    }
    catch (err) {}
  }

  rethrow('Exhausted all data sources')
}
