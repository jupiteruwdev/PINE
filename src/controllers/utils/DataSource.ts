import SuperError from '@andrewscwei/super-error'
import _ from 'lodash'
import fault from '../../utils/fault'
import rethrow from '../../utils/rethrow'

type DataSource<R> = () => Promise<R>

namespace DataSource {

  /**
   * Composes multiple {@link DataSource} requests into one, where the first non-empty data fetched
   * from a data source will be returned. The data sources are requested in series.
   *
   * @param dataSources - A set of asynchronous data sources returning the same type of data.
   *
   * @returns The composed {@link DataSource}.
   */
  export function compose<T>(...dataSources: DataSource<T>[]): DataSource<T> {
    return async () => {
      const n = dataSources.length

      if (n === 0) rethrow('Minimum of 1 data source required for composition')

      let errorStack: SuperError | undefined

      for (let i = 0; i < n; i++) {
        const dataSource = dataSources[i]

        try {
          const res = await dataSource.apply(undefined)
          if (!isResultInvalid(res)) return res
          rethrow('Result fetched from data source is invalid, proceeding to next data source if any')
        }
        catch (err) {
          const tmp = SuperError.deserialize(err)
          errorStack = new SuperError(tmp.message, tmp.code, tmp.info, errorStack)
        }
      }

      rethrow(fault('ERR_OUT_OF_DATA_SOURCES', 'Exhausted all data sources yielding no non-empty result', errorStack))
    }
  }

  /**
   * Fetches data from the specified data sources in order, following the same rules as
   * {@link compose}.
   *
   * @param dataSources - A set of asynchronous data sources returning the same type of data.
   *
   * @returns The first fetched non-empty data.
   */
  export async function fetch<T>(...dataSources: DataSource<T>[]): Promise<T> {
    const res = await compose(...dataSources).apply(undefined)
    return res
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

function isResultInvalid(result: any): boolean {
  if (_.isEmpty(result)) return !_.isArray(result)

  if (_.isPlainObject(result)) {
    let hasValue = false

    for (const key in result) {
      if (!result.hasOwnProperty(key)) continue
      hasValue = hasValue || !isResultInvalid(result[key])
    }

    return !hasValue
  }
  else if (_.isArray(result)) {
    const l = result.length
    let hasValue = false

    for (let i = 0; i < l; i++) {
      hasValue = hasValue || !isResultInvalid(result[i])
    }

    return !hasValue
  }

  return false
}
