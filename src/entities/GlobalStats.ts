import Value from './Value'

type GlobalStats = {
  capacity: Value<'USD'>
  total_lent_historical: Value<'USD'>
  total_value_locked: Value<'USD'>
  utilization_ratio: number
  utilization: Value<'USD'>
}

export default GlobalStats
