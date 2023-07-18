import BigNumber from 'bignumber.js'
import { ethers } from 'ethers'
import _ from 'lodash'
import sftABI from '../../abis/SolvSft.json' assert { type: 'json' }
import { AnyCurrency, Blockchain, Collection, Valuation, Value } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import { getRedisCache, setRedisCache } from '../../utils/redis'
import rethrow from '../../utils/rethrow'
import DataSource from '../utils/DataSource'
import getEthWeb3 from '../utils/getEthWeb3'
import getRequest from '../utils/getRequest'

type Params = {
  blockchain: Blockchain
  collection: Collection
  nftId: string
}

export function useCoingecko(symbol: string | undefined, amountEth: number | string | BigNumber = 1): DataSource<Value<AnyCurrency>> {
  return async () => {
    try {
      logger.info(`... using coingecko to fetch ${symbol} price`)

      const id = symbol || ''
      const redisKey = `solv:nft:valuation:${symbol}`

      const redisData = await getRedisCache(redisKey)
      const amount = new BigNumber(amountEth)

      if (redisData) {
        const timestamp = _.get(redisData, 'timestamp')

        if (Date.now() - timestamp <= 60 * 5 * 1000) {
          const price = new BigNumber(_.get(redisData, 'price'))
          return Value.$USD(amount.times(price))
        }
      }

      const data = await getRequest(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=eth`)
        .catch(err => { throw fault('ERR_ETH_FETCH_USD_PRICE', undefined, err) })

      const priceData = _.get(data, [id, 'eth'])

      setRedisCache(redisKey, priceData)

      const price = new BigNumber(priceData)

      return Value.$USD(amount.times(price))
    }
    catch (err) {
      throw fault('ERR_GET_ETH_VALUE_USD_USE_COINGECKO', undefined, err)
    }
  }
}

export default async function getSolvSFTValuation({
  blockchain,
  collection,
  nftId,
}: Params): Promise<Valuation> {
  try {
    logger.info(`Fetching valuation for Solv SFT <${collection.address}/${nftId}>...`)
    const web3 = getEthWeb3(blockchain.networkId)
    const sftContract = new web3.eth.Contract(sftABI as any, web3.utils.toChecksumAddress(collection.address))

    const marketId = collection.sftMarketId
    // Check if the nftId belongs to the marketId
    const nftMarketId = await sftContract.methods.slotOf(nftId).call()
    if (marketId !== nftMarketId) {
      logger.error(`Solv SFT <${collection.address}/${nftId}> does not belong to market <${marketId}>`)
      rethrow('ERR_SFT_NOT_IN_MARKET')
    }
    const sftDenomination = collection.sftDenomination
    const tokenValue = await sftContract.methods.balanceOf(nftId).call()
    const denominationPrice = await DataSource.fetch(useCoingecko(sftDenomination, Number(ethers.utils.formatEther(tokenValue.toString()))))

    return Valuation.factory({
      value: Value.$ETH(denominationPrice.amount),
      value24Hr: Value.$ETH(denominationPrice.amount),
      timestamp: Date.now(),
    })
  }
  catch (error) {
  }
  return Valuation.factory({
  })
}
