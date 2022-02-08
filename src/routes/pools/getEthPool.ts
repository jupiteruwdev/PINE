import { RequestHandler } from 'express'
import _ from 'lodash'
import getCollateralOutstanding from '../../core/getCollateralOutstanding'
import getPoolCapacity from '../../core/getPoolCapacity'
import getPoolCollaterals from '../../core/getPoolCollaterals'
import Blockchain from '../../entities/Blockchain'
import Pool from '../../entities/Pool'
import { EthNetwork } from '../../utils/ethereum'
import logger from '../../utils/logger'

export default function getEthPool(): RequestHandler {
  return async (req, res) => {
    const networkId = _.toNumber(req.query.network_id ?? EthNetwork.MAIN)
    const poolAddress = req.params.address

    logger.info(`Fetching ETH loan pool for address <${poolAddress}> on network <${networkId}>...`)

    const nftIds = await getPoolCollaterals(poolAddress, { networkId })
    const capacity = await getPoolCapacity(poolAddress, { networkId })
    const valueLent = _.sum(await Promise.all(nftIds.map(nftId => getCollateralOutstanding(nftId, poolAddress, { networkId }))))
    const valueLocked = capacity + valueLent

    logger.info(`Fetching ETH loan pool for address <${poolAddress}> on network <${networkId}>... OK`)

    const blockchain: Blockchain = {
      'network': 'ethereum',
      'network_id': networkId.toString(),
    }

    const payload: Pool = {
      'address': poolAddress,
      'currency': {
        blockchain,
        'name': 'ether',
      },
      'value_lent': valueLent,
      'value_locked': valueLocked,
    }

    res.status(200).json(payload)
  }
}
