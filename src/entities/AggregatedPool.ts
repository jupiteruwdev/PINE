import Collection from './Collection'
import Pool from './Pool'
import Value from './Value'

type AggregatedPool = {
  collection: Collection
  pools: Pool[]
  total_value_lent: Value<'USD'>
  total_value_locked: Value<'USD'>
}

export default AggregatedPool
