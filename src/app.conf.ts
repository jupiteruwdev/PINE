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
  devKmsCredentials: {
    projectId: 'pinedefi', // your project id in gcp
    locationId: 'northamerica-northeast2', // the location where your key ring was created
    keyRingId: 'testvaulation', // the id of the key ring
    keyId: 'sd', // the name/id of your key in the key ring
    keyVersion: '1', // the version of the key
  },
  prodKmsCredenials: {
    projectId: 'pinedefi', // your project id in gcp
    locationId: 'eur6', // the location where your key ring was created
    keyRingId: 'VSHSM', // the id of the key ring
    keyId: 'vss', // the name/id of your key in the key ring
    keyVersion: '1', // the version of the key
  },
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
  looksrareAPIKey: process.env.LOOKSRARE_API_KEY,
  spicyestAPIKey: process.env.SPICYEST_API_KEY,
  x2y2APIKey: process.env.X2Y2_API_KEY,
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? 30000),
  metaquantsAPIKey: process.env.METAQUANTS_API_KEY,
  ethBlocksPerSecond: 14,
  alchemyAPIUrl: {
    [Blockchain.Ethereum.Network.RINKEBY]: 'https://eth-rinkeby.g.alchemy.com/v2/',
    [Blockchain.Ethereum.Network.MAIN]: 'https://eth-mainnet.g.alchemy.com/v2/',
    [Blockchain.Ethereum.Network.GOERLI]: 'https://eth-goerli.g.alchemy.com/v2/',
    [Blockchain.Polygon.Network.MAIN]: 'https://polygon-mainnet.g.alchemy.com/v2/',
    [Blockchain.Polygon.Network.MUMBAI]: 'https://polygon-mumbai.g.alchemy.com/v2/',
  },
  alchemyNFTAPIUrl: {
    [Blockchain.Ethereum.Network.RINKEBY]: 'https://eth-rinkeby.g.alchemy.com/nft/v2/',
    [Blockchain.Ethereum.Network.MAIN]: 'https://eth-mainnet.g.alchemy.com/nft/v2/',
    [Blockchain.Ethereum.Network.GOERLI]: 'https://eth-goerli.g.alchemy.com/nft/v2/',
    [Blockchain.Polygon.Network.MAIN]: 'https://polygon-mainnet.g.alchemy.com/nft/v2/',
    [Blockchain.Polygon.Network.MUMBAI]: 'https://polygon-mumbai.g.alchemy.com/nft/v2/',
  },
  subgraphAPIUrl: {
    [Blockchain.Ethereum.Network.RINKEBY]: process.env.SUBGRAPH_API_RINKEBY_URL,
    [Blockchain.Ethereum.Network.MAIN]: process.env.SUBGRAPH_API_MAINNET_URL,
    [Blockchain.Polygon.Network.MUMBAI]: process.env.SUBGRAPH_API_POLYGON_MUMBAI_URL,
    [Blockchain.Polygon.Network.MAIN]: process.env.SUBGRAPH_API_POLYGON_MAINNET_URL,
  },
  ethRPC: {
    [Blockchain.Ethereum.Network.RINKEBY]: process.env.ETH_RPC_RINKEBY,
    [Blockchain.Ethereum.Network.MAIN]: process.env.ETH_RPC_MAINNET,
    [Blockchain.Ethereum.Network.GOERLI]: process.env.ETH_RPC_GOERLI,
    [Blockchain.Polygon.Network.MAIN]: process.env.POLYGON_RPC_MAINNET,
    [Blockchain.Polygon.Network.MUMBAI]: process.env.POLYGON_RPC_MUMBAI,
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
    [Blockchain.Polygon.Network.MAIN]: '0x85B609F4724860feAd57e16175e66CF1F51bF72D',
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
    [Blockchain.Ethereum.Network.MAIN]: '0x083EcE0c4078874D111278ba3a030fAe464a5ed8',
  },
  valuationSignerMessageHashAddress: {
    [Blockchain.Ethereum.Network.RINKEBY]: '0x150A1a9015Bfaf54e7199eBb6ae35EBDE755D51D',
    [Blockchain.Ethereum.Network.MAIN]: '0x90dFb72736481BBacc7938d2D3673590B92647AE',
    [Blockchain.Ethereum.Network.GOERLI]: '0xfce1DFFE2A382f66ebD01F39b4e20d97B8110895',
    [Blockchain.Polygon.Network.MAIN]: '0xc8A5181f1E4A83e631aa88E3e3d7b860b4A1C314',
  },
  routerAddress: {
    [Blockchain.Ethereum.Network.MAIN]: '0x7a517e8bd374565615c043C32760ba4BD9982219',
    [Blockchain.Ethereum.Network.RINKEBY]: '0xFC6c6e4727DA5E1bF79aC9C96155B4cD2faC54E6',
    [Blockchain.Polygon.Network.MAIN]: '0x125488d05fe1D48A8B9053b7C1B021aEF08f1c02',
  },
  repayRouterAddress: {
    [Blockchain.Ethereum.Network.MAIN]: '0x2B5DC8223D0aD809607f36a1D8A3A11bf20d595e',
    [Blockchain.Ethereum.Network.RINKEBY]: '0xFC6c6e4727DA5E1bF79aC9C96155B4cD2faC54E6',
    [Blockchain.Polygon.Network.MAIN]: '0x125488d05fe1D48A8B9053b7C1B021aEF08f1c02',
  },
  rolloverAddress: {
    [Blockchain.Ethereum.Network.MAIN]: '0x5284d97a1462A767F385aE6Ae89BA9065ecE193c',
    [Blockchain.Ethereum.Network.RINKEBY]: '0xC796d62fB1927a13D7E41eBd0c8eA80fdA5Ef80a',
    [Blockchain.Polygon.Network.MAIN]: '0x03542e5D86e39304FE347c779De78F3157ca3e6f',
  },
  poolHelperAddress: {
    [Blockchain.Ethereum.Network.MAIN]: '0x0aab1368f6704e8403105162690bdf6ee75305c0',
    [Blockchain.Polygon.Network.MAIN]: '0xd8785Fa74dc7D94558c62D0ba9e6452437aC967B',
  },
  pinePieceGenesisAddress: {
    [Blockchain.Ethereum.Network.MAIN]: '0xacadb3c6290392f59f45dddacca8add2cec24366',
  },
  nftIds: {
    ['0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85']: '53058332222413349876246999554393122531581216651837749203253759491527730476185',
    ['0x059edd72cd353df5106d2b9cc5ab83a52287ac3a']: '9472',
  },
  vePINEAddress: '0x90dFb72736481BBacc7938d2D3673590B92647AE',
  merkleAddress: '0xA5A19273bBf8f144e3F25d1468359f62f9Ba2CCB',
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
  snapshotPeriod: 39000,
  rewardPINE: 5952,
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
  signer: process.env.SIGNER,
  looksrareAPIUrl: {
    [Blockchain.Ethereum.Network.MAIN]: process.env.LOOKSRARE_API_URL_MAINNET,
    [Blockchain.Ethereum.Network.GOERLI]: process.env.LOOKSRARE_API_URL_GOERLI,
  },
  wethAddress: {
    [Blockchain.Ethereum.Network.MAIN]: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    [Blockchain.Ethereum.Network.GOERLI]: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
    [Blockchain.Polygon.Network.MAIN]: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  },
  turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY,
  sentryApiDsn: process.env.SENTRY_API_DSN,
  alchemySigningKey: process.env.ALCHEMY_SIGNING_KEY ?? '',
  incentiveRewards: 2500000,
  stakingRewards: 41666,
  bidTreasuryContractAddress: {
    [Blockchain.Ethereum.Network.MAIN]: '',
    [Blockchain.Ethereum.Network.GOERLI]: '0x9e70ef3cd5565f4eb78996eb037765d759cc257b',
  },
}
