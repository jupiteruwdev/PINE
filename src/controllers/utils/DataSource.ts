import _ from 'lodash'
import rethrow from '../../utils/rethrow'

type DataSource<R> = () => Promise<R>

namespace DataSource {

  /**
   * Composes multiple {@link DataSource} requests into one, where the first non-empty data fetched
   * from a data source will be returned. The data sources are requested in series.
   *
   * @param dataSources - A set of asynchronous data sources returning the same type of data.
   *
   * @returns The first fetched non-empty data.
   */
  export function compose<T>(...dataSources: DataSource<T>[]): DataSource<T> {
    return async () => {
      const n = dataSources.length

      if (n === 0) rethrow('Minimum of 1 data source required for composition')

      for (let i = 0; i < n; i++) {
        const dataSource = dataSources[i]

        try {
          const res = await dataSource.apply(undefined)
          if (!isResultValid(res)) return res
        }
        catch (err) {}
      }

      rethrow('Exhausted all data sources yielding no non-empty result')
    }
  }

  /**
   * Creates a {@link DataSource} from an async function with no params.
   *
   * @param func - The async function.
   *
   * @returns A {@link DataSource} created from the async function.
   */
  export function from0<T>(func: () => Promise<T>): DataSource<T> {
    return async () => func()
  }

  /**
   * Creates a {@link DataSource} from an async function expecting 1 argument.
   *
   * @param func - The async function.
   * @param arg - The expected argument for the async function.
   *
   * @returns A {@link DataSource} created from the async function with the given param.
   */
  export function from1<T, P>(func: (arg: P) => Promise<T>, arg: P): DataSource<T> {
    return async () => func(arg)
  }
}

export default DataSource

function isResultValid(result: any): boolean {
  if (_.isEmpty(result)) return !_.isArray(result)

  if (_.isPlainObject(result)) {
    let hasValue = false

    for (const key in result) {
      if (!result.hasOwnProperty(key)) continue
      hasValue = hasValue || !isResultValid(result[key])
    }

    return !hasValue
  }
  else if (_.isArray(result)) {
    const l = result.length
    let hasValue = false

    for (let i = 0; i < l; i++) {
      hasValue = hasValue || !isResultValid(result[i])
    }

    return !hasValue
  }

  return false
}
