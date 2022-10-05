
import appConf from '../../app.conf'
import { Blockchain } from '../../entities'
import Tenor from '../utils/Tenor'
import searchPublishedPools from './searchPublishedPools'

type Params = {
  blockchainFilter: Blockchain.Filter
  collectionAddress?: string
  nftId?: string
}

export default async function countPoolsByTenors({ blockchainFilter, collectionAddress, nftId }: Params): Promise<number[]> {
  const tenors = appConf.tenors
  const pools = await searchPublishedPools({ blockchainFilter, collectionAddress, nftId, tenors })
  const poolsByTenors: number[] = []

  tenors.forEach(tenor => {
    poolsByTenors.push(pools.filter(
      pool => pool.loanOptions.find(loanOption => Tenor.convertTenor(tenor) === loanOption.loanDurationSeconds)
    ).length)
  })

  return poolsByTenors
}
