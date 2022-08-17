import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, Collection, Fee, LoanOption, Pool } from '../../entities'
import { getOnChainPools } from '../../subgraph'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import { getEthCollectionMetadata } from '../collections'

type Params = {
  blockchainFilter?: Blockchain.Filter
  lenderAddress?: string
  address?: string
  excludeAddresses?: string[]
  collectionAddress?: string
}

type MapPoolParams = {
  blockchain: Blockchain
  pools: any[]
}

async function mapPool({ blockchain, pools }: MapPoolParams): Promise<Pool[]> {
  const poolsData = await Promise.all(_.map(pools, (async pool => {
    const collectionMetadata = await getEthCollectionMetadata({ blockchain, poolAddress: pool.id, collectionAddress: pool.collection })

    return Pool.factory({
      version: 2,
      collection: Collection.factory({
        address: pool.collection,
        blockchain,
        ...collectionMetadata,
      }),
      address: pool.id,
      blockchain,
      loanOptions: [
        LoanOption.factory({
          interestBPSPerBlock: pool.interestBPS1000000XBlock,
          loanDurationBlocks: pool.duration / appConf.blocksPerSecond,
          loanDurationSeconds: pool.duration,
          maxLTVBPS: pool.collateralFactorBPS,
          fees: appConf.defaultFees.map(fee => Fee.factory(fee)),
        }),
      ],
      lenderAddress: pool.lenderAddress ?? '',
      routerAddress: _.get(appConf.routerAddress, blockchain.networkId),
      repayRouterAddress: _.get(appConf.repayRouterAddress, blockchain.networkId),
      rolloverAddress: _.get(appConf.rolloverAddress, blockchain.networkId),
      ethLimit: 0,
      published: false,
    })
  })))

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
  collectionAddress,
}: Params): Promise<Pool[]> {
  logger.info(`Fetching unpublished pools by lender address <${lenderAddress}>, exclude addresses <${excludeAddresses}>, collection address <${collectionAddress}> and address <${address}> on blockchain ${JSON.stringify(blockchainFilter)}`)
  let poolsData: Pool[] = []

  if (blockchainFilter.ethereum !== undefined) {
    const blockchain = Blockchain.Ethereum(blockchainFilter.ethereum)

    switch (blockchain.networkId) {
    case Blockchain.Ethereum.Network.MAIN:
      const { pools: poolMainnet } = await getOnChainPools({ lenderAddress, address, excludeAddresses, collectionAddress }, { networkId: blockchain.networkId })
      poolsData = await mapPool({ blockchain, pools: poolMainnet })
      break
    case Blockchain.Ethereum.Network.RINKEBY:
      const { pools: poolsRinkeby } = await getOnChainPools({ lenderAddress, address, excludeAddresses, collectionAddress }, { networkId: blockchain.networkId })
      poolsData = await mapPool({ blockchain, pools: poolsRinkeby })
    }
  }
  else {
    throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
  }

  return poolsData
}
