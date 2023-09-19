import { PoolModel } from '../../database'
import { Blockchain } from '../../entities'
import fault from '../../utils/fault'
import { getRedisCache, setRedisCache } from '../../utils/redis'
import getPoolContract from './getPoolContract'

type Params = {
  blockchain: Blockchain
  poolAddress: string
}

export default async function getPoolEthLimit({ blockchain, poolAddress }: Params) {
  try {
    if (!Blockchain.isEVMChain(blockchain)) throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    const poolContract = await getPoolContract({ blockchain, poolAddress })
    const pool = await PoolModel.findOne({ address: poolAddress }).lean()

    if (!pool?.noMaxLoanLimit) {
      try {
        const ethLimit = await poolContract.methods._maxLoanLimit().call()
        return ethLimit
      }
      catch (err) {
        await PoolModel.updateOne({
          address: poolAddress.toLowerCase(),
        }, {
          $set: {
            noMaxLoanLimit: true,
          },
        })
        return null
      }
    }
    else {
      if (pool) return null
      const redisKey = `poolEthLimit:${poolAddress}:${blockchain.networkId}`
      const redisData = await getRedisCache(redisKey)

      if (redisData) {
        return null
      }

      try {
        const ethLimit = await poolContract.methods._maxLoanLimit().call()

        return ethLimit
      }
      catch (err) {
        setRedisCache(redisKey, { noMaxLoanLimit: true })
        return null
      }
    }
  }
  catch (err) {
    throw fault('ERR_GET_POOL_ETH_LIMIT', undefined, err)
  }
}
