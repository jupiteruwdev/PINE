import Value from './Value'

type GlobalStats = {
  capacity: Value<'USD'>
  totalValueLentHistorical: Value<'USD'>
  totalValueLocked: Value<'USD'>
  utilization: Value<'USD'>
  utilizationRatio: number
}

export default GlobalStats
