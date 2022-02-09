import Pool from './Pool'

type AggregatedPool = {
  total_value_locked_usd: number
  total_value_lent_usd: number
  pools: Pool[]
}

export default AggregatedPool
