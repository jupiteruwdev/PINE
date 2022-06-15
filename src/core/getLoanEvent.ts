import { Blockchain } from '../entities'
import failure from '../utils/failure'
import logger from '../utils/logger'
import getPoolContract from './getPoolContract'

type Params = {
  blockchain: Blockchain
  nftId: string
  poolAddress: string
}

export default async function getLoanEvent({ blockchain, nftId, poolAddress }: Params) {
  try {
    logger.info(`Getting loan event for NFT ID <${nftId}>, pool address <${poolAddress}, and blockchain <${JSON.stringify(blockchain)}>...`)

    const contract = await getPoolContract({ blockchain, poolAddress })
    const func = '_loans'
    const params = [nftId]
    const event = await contract.methods[func].apply(undefined, params).call()

    logger.info(`Getting loan event for NFT ID <${nftId}>, pool address <${poolAddress}, and blockchain <${JSON.stringify(blockchain)}>... OK: ${JSON.stringify(event)}`)

    return event
  }
  catch (err) {
    logger.error(`Getting loan event for NFT ID <${nftId}>, pool address <${poolAddress}, and blockchain <${JSON.stringify(blockchain)}>... ERR: ${err}`)

    throw failure('FETCH_LOAN_EVENTS_FAILURE', err)
  }
}
