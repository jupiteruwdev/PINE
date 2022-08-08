import _ from 'lodash'
import { Blockchain, Collection, Pool } from '../../entities'
import { getOnChainPools } from '../../subgraph'
import fault from '../../utils/fault'
import logger from '../../utils/logger'

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
  const poolsData = await Promise.all(_.map(pools, (async pool => Pool.factory({
    version: 2,
    collection: Collection.factory({
      address: pool.collection,
      blockchain,
    }),
    address: pool.id,
    blockchain,
    loanOptions: [],
    lenderAddress: pool.lenderAddress ?? '',
    routerAddress: '',
    repayRouterAddress: '',
    rolloverAddress: '',
    ethLimit: 0,
    published: false,
  }))))

  return poolsData
}

export default async function getPools({
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
      const { pools: poolMainnet } = await getOnChainPools({ lenderAddress, address, excludeAddresses }, { networkId: blockchain.networkId })
      poolsData = await mapPool({ blockchain, pools: poolMainnet })
      break
    case Blockchain.Ethereum.Network.RINKEBY:
      const { pools: poolsRinkeby } = await getOnChainPools({ lenderAddress, address, excludeAddresses }, { networkId: blockchain.networkId })
      poolsData = await mapPool({ blockchain, pools: poolsRinkeby })
    }
  }
  else {
    throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
  }

  return poolsData
}
