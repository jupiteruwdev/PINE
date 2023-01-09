import { UserModel } from '../../db'
import { Blockchain } from '../../entities'
import UserMissionStats from '../../entities/lib/UserMissionStats'
import { getOnChainPoolsByLenderAddress, getPNPLHistoriesByBorrowerAddress } from '../../subgraph'
import getOnChainLoanHistoriesByBorrowerAddress from '../../subgraph/getOnChainLoanHistoriesByBorrowerAddress'
import logger from '../../utils/logger'

type Params = {
  blockchain: Blockchain
  address: string
  timestamp?: number
}

export default async function getUserMissionStats({
  blockchain,
  address,
  timestamp,
}: Params): Promise<UserMissionStats> {
  try {
    logger.info(`Fetching user mission stats for blockchain <${JSON.stringify(blockchain)}>...`)

    let user = await UserModel.findOne({
      address: {
        '$regex': address,
        '$options': 'i',
      },
      networkId: blockchain.networkId,
      networkType: blockchain.network,
    }).lean().exec()

    if (!user) {
      user = await UserModel.create({
        address,
        networkId: blockchain.networkId,
        networkType: blockchain.network,
      })
    }

    const loanHistoriesByBorrower = await getOnChainLoanHistoriesByBorrowerAddress({ borrowerAddress: address, timestamp }, { networkId: blockchain.networkId })
    const poolsByLender = await getOnChainPoolsByLenderAddress({ lenderAddress: address, timestamp }, { networkId: blockchain.networkId })
    const phplHistoriesByBorrower = await getPNPLHistoriesByBorrowerAddress({ borrowerAddress: address, timestamp }, { networkId: blockchain.networkId })

    logger.info(`Fetching user mission stats for blokchain <${JSON.stringify(blockchain)}>... OK`)

    return UserMissionStats.factory({
      lend: !!poolsByLender?.length,
      borrow: !!loanHistoriesByBorrower?.length,
      pnpl: !!phplHistoriesByBorrower?.length,
    })
  }
  catch (err) {
    logger.error(`Fetching user mission stats for blockchain <${JSON.stringify(blockchain)}>... ERR:`, err)
    throw err
  }
}
