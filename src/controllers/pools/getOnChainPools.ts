import _ from 'lodash'
import { Blockchain, Pool } from '../../entities'
import { getOnChainPoolsFromGraph } from '../../subgraph'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import { getCollection } from '../collections'

type Params = {
  blockchainFilter?: Blockchain.Filter
  lenderAddress?: string
  address?: string
  excludeAddresses?: string[]
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

export default async function getOnChainPools({
  blockchainFilter = {
    ethereum: Blockchain.Ethereum.Network.MAIN,
    solana: Blockchain.Solana.Network.MAINNET,
  },
  lenderAddress,
  address,
  excludeAddresses,
}: Params): Promise<Pool[]> {
  logger.info(`Fetching unpublished pools by lender address <${lenderAddress}> and address <${address}> on blockchain ${JSON.stringify(blockchainFilter)}`)
  let poolsData: Pool[] = []

  if (blockchainFilter.ethereum !== undefined) {
    const blockchain = Blockchain.Ethereum(blockchainFilter.ethereum)

    switch (blockchain.networkId) {
    case Blockchain.Ethereum.Network.MAIN:
      const { pools: poolMainnet } = await getOnChainPoolsFromGraph({ lenderAddress, address, excludeAddresses }, { networkId: blockchain.networkId })
      poolsData = await mapPool({ blockchain, pools: poolMainnet })
      break
    case Blockchain.Ethereum.Network.RINKEBY:
      const { pools: poolsRinkeby } = await getOnChainPoolsFromGraph({ lenderAddress, address, excludeAddresses }, { networkId: blockchain.networkId })
      poolsData = await mapPool({ blockchain, pools: poolsRinkeby })
    }
  }
  else {
    throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
  }

  return poolsData
}
