import 'dotenv/config'
import fs from 'fs'
import _ from 'lodash'
import path from 'path'
import { fileURLToPath } from 'url'
import { Blockchain } from './entities'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const packageConf = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), { encoding: 'utf8' }))

export default {
  env: process.env.NODE_ENV ?? 'development',
  version: `v${_.get(packageConf, 'version', 'local')}${process.env.NODE_ENV === 'production' ? '' : `-${(process.env.NODE_ENV || 'development').substring(0, 3)}`}`,
  build: process.env.BUILD_NUMBER ?? 'local',
  port: process.env.PORT ?? 8080,
  logLevel: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  openseaAPIKey: process.env.OPENSEA_API_KEY,
  gemxyzAPIKey: process.env.GEMXYZ_API_KEY,
  moralisAPIKey: process.env.MORALIS_API_KEY,
  alchemyAPIKey: process.env.ALCHEMY_API_KEY,
  coinAPIKey: process.env.COIN_API_KEY,
  lunarCrushAPIKey: process.env.LUNARCRUSH_API_KEY,
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? 30000),
  alchemyAPIUrl: {
    [Blockchain.Ethereum.Network.RINKEBY]: 'https://eth-rinkeby.g.alchemy.com/v2/',
    [Blockchain.Ethereum.Network.MAIN]: 'https://eth-mainnet.g.alchemy.com/v2/',
    [Blockchain.Ethereum.Network.GOERLI]: 'https://eth-goerli.g.alchemy.com/v2/',
  },
  alchemyNFTAPIUrl: {
    [Blockchain.Ethereum.Network.RINKEBY]: 'https://eth-rinkeby.g.alchemy.com/nft/v2/',
    [Blockchain.Ethereum.Network.MAIN]: 'https://eth-mainnet.g.alchemy.com/nft/v2/',
    [Blockchain.Ethereum.Network.GOERLI]: 'https://eth-goerli.g.alchemy.com/nft/v2/',
  },
  subgraphAPIUrl: {
    [Blockchain.Ethereum.Network.RINKEBY]: process.env.SUBGRAPH_API_RINKEBY_URL,
    [Blockchain.Ethereum.Network.MAIN]: process.env.SUBGRAPH_API_MAINNET_URL,
  },
  ethRPC: {
    [Blockchain.Ethereum.Network.RINKEBY]: process.env.ETH_RPC_RINKEBY,
    [Blockchain.Ethereum.Network.MAIN]: process.env.ETH_RPC_MAINNET,
    [Blockchain.Ethereum.Network.GOERLI]: process.env.ETH_RPC_GOERLI,
  },
  ethValuationExpiryBlocks: 64, // quote expires in 15 mins
  ethValuationSigner: process.env.VALUATION_SIGNER,
  flashLoanSourceContractAddress: {
    [Blockchain.Ethereum.Network.RINKEBY]: '0x1Bf5d5051eA8025B41e69C139E5fE5d6499A9077',
    [Blockchain.Ethereum.Network.MAIN]: '0x63ca18f8cb75e28f94cf81901caf1e39657ea256',
  },
  controlPlaneContractAddress: {
    [Blockchain.Ethereum.Network.RINKEBY]: '0x5E282F68a7CD593609C05AbCA32482395968d885',
    [Blockchain.Ethereum.Network.MAIN]: '0x9C2780F9e427E29Ba77EDC34C3F42e0865C3FBDF',
  },
  openseaContractAddress: {
    [Blockchain.Ethereum.Network.RINKEBY]: '0xdD54D660178B28f6033a953b0E55073cFA7e3744',
    [Blockchain.Ethereum.Network.MAIN]: '0x00000000006c3852cbEf3e08E8dF289169EdE581',
  },
  looksrareContractAddress: {
    [Blockchain.Ethereum.Network.RINKEBY]: '0x1AA777972073Ff66DCFDeD85749bDD555C0665dA',
    [Blockchain.Ethereum.Network.MAIN]: '0x59728544B08AB483533076417FbBB2fD0B17CE3a',
  },
  x2y2ContractAddress: {
    [Blockchain.Ethereum.Network.GOERLI]: '0x1891EcD5F7b1E751151d857265D6e6D08ae8989e',
    [Blockchain.Ethereum.Network.MAIN]: '0x74312363e45DCaBA76c59ec49a7Aa8A65a67EeD3',
  },
  pnplContractAddress: {
    [Blockchain.Ethereum.Network.RINKEBY]: '0x7D33BdDfe5945687382625547aBD8a0115B87490',
    [Blockchain.Ethereum.Network.MAIN]: '0x514183FAf3ab9Db42D76317ecea74C4300E60EEe',
  },
  valuationSignerMessageHashAddress: {
    [Blockchain.Ethereum.Network.RINKEBY]: '0x150A1a9015Bfaf54e7199eBb6ae35EBDE755D51D',
    [Blockchain.Ethereum.Network.MAIN]: '0x90dFb72736481BBacc7938d2D3673590B92647AE',
    [Blockchain.Ethereum.Network.GOERLI]: '0xfce1DFFE2A382f66ebD01F39b4e20d97B8110895',
  },
  routerAddress: {
    [Blockchain.Ethereum.Network.MAIN]: '0x774badBc759234Bff52B0Be11bF61Bb68c9E9A24',
    [Blockchain.Ethereum.Network.RINKEBY]: '0xFC6c6e4727DA5E1bF79aC9C96155B4cD2faC54E6',
  },
  repayRouterAddress: {
    [Blockchain.Ethereum.Network.MAIN]: '0x1C120cE3853542C0Fe3B75AF8F4c7F223f957d51',
    [Blockchain.Ethereum.Network.RINKEBY]: '0xFC6c6e4727DA5E1bF79aC9C96155B4cD2faC54E6',
  },
  rolloverAddress: {
    [Blockchain.Ethereum.Network.MAIN]: '0x239f1818f21ebac47306ffa690016aa6a8882a59',
    [Blockchain.Ethereum.Network.RINKEBY]: '0xC796d62fB1927a13D7E41eBd0c8eA80fdA5Ef80a',
  },
  poolHelperAddress: {
    [Blockchain.Ethereum.Network.MAIN]: '0x0aab1368f6704e8403105162690bdf6ee75305c0',
  },
  defaultFees: [
    {
      type: 'fixed',
      value: { 'amount': '0.01', 'currency': 'ETH' },
    },
    {
      type: 'percentage',
      value: 0.0035,
    },
  ],
  blocksPerSecond: 14,
  valuationLimitation: 60 * 30 * 1000,
  ethMaxDecimalPlaces: 6,
  mongoUri: process.env.MONGO_URI ?? '',
  tenors: [1, 3, 7, 14, 30, 60, 90],
  tests: {
    walletAddress: process.env.TESTS_WALLET_ADDRESS ?? '',
    privateKey: process.env.TESTS_WALLET_PRIVATE_KEY ?? '',
    whaleWalletAddresses: _.compact((process.env.TESTS_WHALE_WALLET_ADDRESSES ?? '').split(',')),
  },
  workerUrl: process.env.WORKER_URL,
  // `workerCloudRunUrl` variable is required when deployed inside Cloud Run service
  // to allow `core-service` to authenticate requests to `worker`
  workerCloudRunUrl: process.env.WORKER_CLOUD_RUN_URL,
}
