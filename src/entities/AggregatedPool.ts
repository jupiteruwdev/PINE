import Pool from './Pool'
import Value from './Value'

type AggregatedPool = {
  pools: Pool[]
  total_value_lent: Value<'USD'>
  total_value_locked: Value<'USD'>
}

export default AggregatedPool
