import Collection from './Collection'
import Pool from './Pool'
import Value from './Value'

type AggregatedPool = {
  collection: Collection
  pools: Pool[]
  totalValueLent: Value<'USD'>
  totalValueLocked: Value<'USD'>
}

export default AggregatedPool
