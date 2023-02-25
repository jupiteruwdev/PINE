import _ from 'lodash'
import appConf from '../../app.conf'
import { UserModel } from '../../db'
import { Blockchain } from '../../entities'
import UserMissionStats from '../../entities/lib/UserMissionStats'
import { getOnChainPoolsByLenderAddress, getPNPLHistoriesByBorrowerAddress } from '../../subgraph'
import getOnChainLoanHistoriesByBorrowerAddress from '../../subgraph/getOnChainLoanHistoriesByBorrowerAddress'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import getRequest from '../utils/getRequest'

type Params = {
  blockchain: Blockchain
  address: string
  timestamp?: number
}

const arbitraryNFTs = [
  '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d', // BAYC
  '0x60e4d786628fea6478f785a6d7e704777c86a7c6', // MAYC
]

export default async function getUserMissionStats({
  blockchain,
  address,
  timestamp,
}: Params): Promise<UserMissionStats> {
  try {
    logger.info(`Fetching user mission stats for blockchain <${JSON.stringify(blockchain)}>...`)
    const apiHost = _.get(appConf.alchemyAPIUrl, blockchain.networkId) ?? rethrow(`Missing Alchemy API URL for blockchain <${JSON.stringify(blockchain)}>`)
    const apiKey = appConf.alchemyAPIKey ?? rethrow('Missing Alchemy API key')

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

    const res = await getRequest(`${apiHost}${apiKey}/getNFTs`, {
      params: {
        owner: address,
        contractAddresses: [
          _.get(appConf.pinePieceGenesisAddress, blockchain.networkId),
          ...arbitraryNFTs,
        ],
      },
    })

    const ownedNfts = _.get(res, 'ownedNfts')
    const isPinePieceGenesisHolder = !!ownedNfts.find((nft: any) => _.get(nft, 'contract.address').toLowerCase() === _.get(appConf.pinePieceGenesisAddress, blockchain.networkId).toLowerCase())
    const isArbitraryNFTHoldings = arbitraryNFTs.filter((arbitraryNFT: string) => !!ownedNfts.find((nft: any) => _.get(nft, 'contract.address').toLowerCase() === arbitraryNFT.toLowerCase()))
    logger.info(`Fetching user mission stats for blokchain <${JSON.stringify(blockchain)}>... OK`)

    return UserMissionStats.factory({
      lend: !!poolsByLender?.length,
      borrow: !!loanHistoriesByBorrower?.length,
      pnpl: !!phplHistoriesByBorrower?.length,
      pinePiece: isPinePieceGenesisHolder,
      arbitraryNfts: isArbitraryNFTHoldings,
      interactionAddresses: user.interactionAddresses ?? [],
    })
  }
  catch (err) {
    logger.error(`Fetching user mission stats for blockchain <${JSON.stringify(blockchain)}>... ERR:`, err)
    throw err
  }
}
