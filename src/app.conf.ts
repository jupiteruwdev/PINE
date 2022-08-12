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
  version: `v${_.get(packageConf, 'version', '0')}${process.env.NODE_ENV === 'production' ? '' : `-${(process.env.NODE_ENV || 'development').substring(0, 3)}`}`,
  build: process.env.BUILD_NUMBER ?? '0',
  port: process.env.PORT ?? 8080,
  openseaAPIKey: process.env.OPENSEA_API_KEY,
  gemxyzAPIKey: process.env.GEMXYZ_API_KEY,
  moralisAPIKey: process.env.MORALIS_API_KEY,
  nftbankAPIKey: process.env.NFTBANK_API_KEY,
  alchemyAPIKey: process.env.ALCHEMY_API_KEY,
  logLevel: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'development' ? 'debug' : undefined),
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? 3000),
  alchemyAPIUrl: {
    [Blockchain.Ethereum.Network.RINKEBY]: process.env.ALCHEMY_API_RINKEBY_URL,
    [Blockchain.Ethereum.Network.MAIN]: process.env.ALCHEMY_API_MAINNET_URL,
  },
  subgraphAPIUrl: {
    [Blockchain.Ethereum.Network.RINKEBY]: process.env.SUBGRAPH_API_RINKEBY_URL,
    [Blockchain.Ethereum.Network.MAIN]: process.env.SUBGRAPH_API_MAINNET_URL,
  },
  ethRPC: {
    [Blockchain.Ethereum.Network.RINKEBY]: process.env.ETH_RPC_RINKEBY,
    [Blockchain.Ethereum.Network.MAIN]: process.env.ETH_RPC_MAINNET,
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
  pnplContractAddress: {
    [Blockchain.Ethereum.Network.RINKEBY]: '0x7D33BdDfe5945687382625547aBD8a0115B87490',
    [Blockchain.Ethereum.Network.MAIN]: '0x514183FAf3ab9Db42D76317ecea74C4300E60EEe',
  },
  valuationSignerMessageHashAddress: {
    [Blockchain.Ethereum.Network.RINKEBY]: '0x150A1a9015Bfaf54e7199eBb6ae35EBDE755D51D',
    [Blockchain.Ethereum.Network.MAIN]: '0x90dFb72736481BBacc7938d2D3673590B92647AE',
  },
  mongoUri: process.env.MONGO_URI ?? '',
  tenors: [1, 3, 7, 14, 30],
  tests: {
    logLevel: process.env.TESTS_LOG_LEVEL,
    walletAddress: process.env.TESTS_WALLET_ADDRESS ?? '',
    privateKey: process.env.TESTS_WALLET_PRIVATE_KEY ?? '',
    whaleWalletAddresses: _.compact((process.env.TESTS_WHALE_WALLET_ADDRESSES ?? '').split(',')),
  },
}
