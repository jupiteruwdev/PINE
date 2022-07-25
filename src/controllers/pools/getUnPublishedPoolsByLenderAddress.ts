import _ from 'lodash'
import { Blockchain, Pool } from '../../entities'
import getOnChainPoolsByLenderAddress from '../../subgraph/getOnChainPoolsByLenderAddress'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import { getCollection } from '../collections'

type Params = {
  blockchainFilter?: Blockchain.Filter
  lenderAddress: string
}

export default async function getUnPublishedPoolsByLenderAddress({
  blockchainFilter = {
    ethereum: Blockchain.Ethereum.Network.MAIN,
    solana: Blockchain.Solana.Network.MAINNET,
  },
  lenderAddress,
}: Params): Promise<Pool[]> {
  logger.info(`Fetching unpublished pools by lender address <${lenderAddress}> on blockchain ${JSON.stringify(blockchainFilter)}`)
  let poolsData: Pool[] = []

  if (blockchainFilter.ethereum !== undefined) {
    const blockchain = Blockchain.Ethereum(blockchainFilter.ethereum)

    switch (blockchain.networkId) {
    case Blockchain.Ethereum.Network.MAIN:
      const { pools: poolMainnet } = await getOnChainPoolsByLenderAddress({ lenderAddress }, { networkId: blockchain.networkId })

      poolsData = await Promise.all(_.map(poolMainnet, (async pool => {
        const collection = await getCollection({ address: pool.collection, blockchain })
        return {
          version: 2,
          collection,
          address: pool.id,
          blockchain,
          loanOptions: [],
          lenderAddress: pool.lenderAddress,
          routerAddress: '',
          repayRouterAddress: '',
          rolloverAddress: '',
          ethLimit: 0,
          published: false,
        } as Pool
      })))
      break
    case Blockchain.Ethereum.Network.RINKEBY:
      const { pools: poolsRinkeby } = await getOnChainPoolsByLenderAddress({ lenderAddress }, { networkId: blockchain.networkId })
      poolsData = await Promise.all(_.map(poolsRinkeby, (async pool => {
        const collection = await getCollection({ address: pool.collection, blockchain })
        return {
          version: 2,
          collection,
          address: pool.id,
          blockchain,
          loanOptions: [],
          lenderAddress: pool.lenderAddress,
          routerAddress: '',
          repayRouterAddress: '',
          rolloverAddress: '',
          ethLimit: 0,
          published: false,
        } as Pool
      })))
    }
  }
  else {
    throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
  }

  return poolsData
}
