import BigNumber from 'bignumber.js'
import { Blockchain } from '../../entities'
import logger from '../../utils/logger'
import { getPoolContract } from '../contracts'

type Params = {
  address: string
  blockchain: Blockchain
}

async function getPoolMaxLoanLimit({ address, blockchain }: Params): Promise<string | null> {
  const poolContract = await getPoolContract({ blockchain, poolAddress: address })

  try {
    const maxLoanLimit = await poolContract.methods._maxLoanLimit().call()
    return new BigNumber(maxLoanLimit).gt('0') ? maxLoanLimit : null
  }
  catch (err) {
    logger.info(`Get max loan limit for pool ${address} ERR:`, err)
    return null
  }
}

export default getPoolMaxLoanLimit
