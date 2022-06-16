import 'dotenv/config'
import { EthereumNetwork } from './entities'

export default {
  env: process.env.NODE_ENV ?? 'development',
  version: `v${require('../package.json').version}${process.env.NODE_ENV === 'production' ? '' : `-${(process.env.NODE_ENV || 'development').substring(0, 3)}`}`,
  build: process.env.BUILD_NUMBER ?? '0',
  port: process.env.PORT ?? 8080,
  openseaAPIKey: process.env.OPENSEA_API_KEY,
  moralisAPIKey: process.env.MORALIS_API_KEY,
  nftbankAPIKey: process.env.NFTBANK_API_KEY,
  alchemyAPIKey: process.env.ALCHEMY_API_KEY,
  alchemyAPIUrl: {
    [EthereumNetwork.RINKEBY]: process.env.ALCHEMY_API_RINKEBY_URL,
    [EthereumNetwork.MAIN]: process.env.ALCHEMY_API_MAINNET_URL,
  },
  subgraphAPIUrl: process.env.SUBGRAPH_API_URL ?? '',
  ethRPC: {
    [EthereumNetwork.RINKEBY]: process.env.ETH_RPC_RINKEBY,
    [EthereumNetwork.MAIN]: process.env.ETH_RPC_MAINNET,
  },
  ethValuationExpiryBlocks: 64, // quote expires in 15 mins
  ethValuationSigner: process.env.VALUATION_SIGNER,
  flashLoanSourceContractAddress: {
    [EthereumNetwork.RINKEBY]: '0x1Bf5d5051eA8025B41e69C139E5fE5d6499A9077',
    [EthereumNetwork.MAIN]: '0x63ca18f8cb75e28f94cf81901caf1e39657ea256',
  },
  controlPlaneContractAddress: {
    [EthereumNetwork.RINKEBY]: '0x5E282F68a7CD593609C05AbCA32482395968d885',
    [EthereumNetwork.MAIN]: '0x9C2780F9e427E29Ba77EDC34C3F42e0865C3FBDF',
  },
  openseaContractAddress: {
    [EthereumNetwork.RINKEBY]: '0xdD54D660178B28f6033a953b0E55073cFA7e3744',
    [EthereumNetwork.MAIN]: '0x7f268357A8c2552623316e2562D90e642bB538E5',
  },
  looksrareContractAddress: {
    [EthereumNetwork.RINKEBY]: '0x1AA777972073Ff66DCFDeD85749bDD555C0665dA',
    [EthereumNetwork.MAIN]: '0x59728544B08AB483533076417FbBB2fD0B17CE3a',
  },
  pnplContractAddress: {
    [EthereumNetwork.RINKEBY]: '0x7D33BdDfe5945687382625547aBD8a0115B87490',
    [EthereumNetwork.MAIN]: '0x514183FAf3ab9Db42D76317ecea74C4300E60EEe',
  },
  valuationSignerMessageHashAddress: {
    [EthereumNetwork.RINKEBY]: '0x150A1a9015Bfaf54e7199eBb6ae35EBDE755D51D',
    [EthereumNetwork.MAIN]: '0x90dFb72736481BBacc7938d2D3673590B92647AE',
  },
  mongoPassword: process.env.MONGO_PASSWORD,
}
