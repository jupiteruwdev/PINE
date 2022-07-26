import _ from 'lodash'
import { Blockchain, Pool } from '../../entities'
import getOnChainPoolsByLenderAddress from '../../subgraph/getOnChainPoolsByLender'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import { getCollection } from '../collections'

type Params = {
  blockchainFilter?: Blockchain.Filter
  lenderAddress: string
}

type MapPoolParams = {
  blockchain: Blockchain
  pools: any[]
}

async function mapPool({ blockchain, pools }: MapPoolParams): Promise<Pool[]> {
  const poolsData = await Promise.all(_.map(pools, (async pool => {
    const collection = await getCollection({ address: pool.collection, blockchain })
    return Pool.factory({
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
    })
  })))

  return poolsData
}

export default async function getUnpublishedPoolsByLender({
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
      poolsData = await mapPool({ blockchain, pools: poolMainnet })
      break
    case Blockchain.Ethereum.Network.RINKEBY:
      const { pools: poolsRinkeby } = await getOnChainPoolsByLenderAddress({ lenderAddress }, { networkId: blockchain.networkId })
      poolsData = await mapPool({ blockchain, pools: poolsRinkeby })
    }
  }
  else {
    throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
  }

  return poolsData
}
