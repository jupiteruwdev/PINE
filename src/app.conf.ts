import 'dotenv/config'
import fs from 'fs'
import _ from 'lodash'
import path from 'path'
import { fileURLToPath } from 'url'
import { Blockchain } from './entities'
import rethrow from './utils/rethrow'

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
  coinAPIKey: process.env.COIN_API_KEY,
  lunarCrushAPIKey: process.env.LUNARCRUSH_API_KEY,
  looksrareAPIKey: process.env.LOOKSRARE_API_KEY,
  spicyestAPIKey: process.env.SPICYEST_API_KEY,
  zyteAPIKey: process.env.ZYTE_API_KEY,
  nftPerpAPIKey: process.env.NFT_PERP_API_KEY,
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? 30000),
  metaquantsAPIKey: process.env.METAQUANTS_API_KEY,
  ethBlocksPerSecond: 14,
  reservoirAPIBaseUrl: {
    [Blockchain.Ethereum.Network.MAIN]: 'https://api.reservoir.tools',
    [Blockchain.Polygon.Network.MAIN]: 'https://api-polygon.reservoir.tools',
    [Blockchain.Arbitrum.Network.MAINNET]: 'https://api-arbitrum.reservoir.tools',
    [Blockchain.Avalanche.Network.MAINNET]: 'https://api-avalanche.reservoir.tools',
  },
  reservoirAPIKey: {
    [Blockchain.Ethereum.Network.MAIN]: process.env.RESERVOIR_MAINNET_API_KEY ?? rethrow('Missing Reservoir API key for ethereum'),
    [Blockchain.Polygon.Network.MAIN]: process.env.RESERVOIR_POLYGON_API_KEY ?? rethrow('Missing Reservoir API key for polygon'),
    [Blockchain.Arbitrum.Network.MAINNET]: process.env.RESERVOIR_ARBITRUM_API_KEY ?? rethrow('Missing Reservoir API key for arbitrum'),
    [Blockchain.Avalanche.Network.MAINNET]: process.env.RESERVOIR_AVALANCHE_API_KEY ?? rethrow('Missing Reservoir API key for avalanche'),
  },
  alchemyAPIUrl: {
    [Blockchain.Ethereum.Network.MAIN]: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY_MAINNET}`,
    [Blockchain.Ethereum.Network.GOERLI]: `https://eth-goerli.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY_GOERLI}`,
    [Blockchain.Polygon.Network.MAIN]: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY_POLYGON_MAINNET}`,
    [Blockchain.Polygon.Network.MUMBAI]: `https://polygon-mumbai.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY_POLYGON_MUMBAI}`,
    [Blockchain.Arbitrum.Network.MAINNET]: `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY_ARBITRUM_MAINNET}`,
  },
  subgraphAPIUrl: {
    [Blockchain.Ethereum.Network.RINKEBY]: process.env.SUBGRAPH_API_RINKEBY_URL ?? 'https://api.thegraph.com/subgraphs/name/pinedefi/open-loans-four',
    [Blockchain.Ethereum.Network.MAIN]: process.env.SUBGRAPH_API_MAINNET_URL ?? 'https://api.thegraph.com/subgraphs/name/pinedefi/open-loans-staging',
    [Blockchain.Polygon.Network.MUMBAI]: process.env.SUBGRAPH_API_POLYGON_MUMBAI_URL,
    [Blockchain.Polygon.Network.MAIN]: process.env.SUBGRAPH_API_POLYGON_MAINNET_URL ?? 'https://api.thegraph.com/subgraphs/name/pinedefi/open-loans-polygon',
    [Blockchain.Arbitrum.Network.MAINNET]: process.env.SUBGRAPH_API_ARBITRUM_MAINNET_URL ?? 'https://api.thegraph.com/subgraphs/name/pinedefi/arbitrum-pine',
    [Blockchain.Avalanche.Network.MAINNET]: process.env.SUBGRAPH_API_AVALANCHE_MAINNET_URL ?? 'https://api.thegraph.com/subgraphs/name/pinedefi/avalanche-pine',
  },
  ethRPC: {
    [Blockchain.Ethereum.Network.MAIN]: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY_MAINNET}`,
    [Blockchain.Ethereum.Network.GOERLI]: `https://eth-goerli.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY_GOERLI}`,
    [Blockchain.Ethereum.Network.RINKEBY]: process.env.ETH_RPC_RINKEBY,
    [Blockchain.Polygon.Network.MAIN]: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY_POLYGON_MAINNET}`,
    [Blockchain.Polygon.Network.MUMBAI]: `https://polygon-mumbai.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY_POLYGON_MUMBAI}`,
    [Blockchain.Arbitrum.Network.MAINNET]: `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY_ARBITRUM_MAINNET}`,
    [Blockchain.Avalanche.Network.MAINNET]: `https://avalanche-mainnet.infura.io/v3/${process.env.INFURA_API_KEY_AVALANCHE_MAINNET}`,
  },
  ethValuationExpiryBlocks: 64, // quote expires in 15 mins
  ethValuationSigner: process.env.VALUATION_SIGNER,
  flashLoanSourceContractAddress: {
    [Blockchain.Ethereum.Network.RINKEBY]: '0x1Bf5d5051eA8025B41e69C139E5fE5d6499A9077',
    [Blockchain.Ethereum.Network.MAIN]: '0x63ca18f8cb75e28f94cf81901caf1e39657ea256',
    [Blockchain.Polygon.Network.MAIN]: '0xb93bc157771e701452f0e4521a580c4552b55abc',
    [Blockchain.Arbitrum.Network.MAINNET]: '',
    [Blockchain.Avalanche.Network.MAINNET]: '',
  },
  controlPlaneContractAddress: {
    [Blockchain.Ethereum.Network.RINKEBY]: '0x5E282F68a7CD593609C05AbCA32482395968d885',
    [Blockchain.Ethereum.Network.MAIN]: '0x9C2780F9e427E29Ba77EDC34C3F42e0865C3FBDF',
    [Blockchain.Polygon.Network.MAIN]: '0x85B609F4724860feAd57e16175e66CF1F51bF72D',
    [Blockchain.Arbitrum.Network.MAINNET]: '0x46031553804e733dF8a38FaBE319bB7C888771D7',
    [Blockchain.Avalanche.Network.MAINNET]: '0xac8e3c7b9ae7d8e1a3b360d2e59ed687a4aa68e4',
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
    [Blockchain.Arbitrum.Network.MAINNET]: '0x90dFb72736481BBacc7938d2D3673590B92647AE',
    [Blockchain.Avalanche.Network.MAINNET]: '0x90dFb72736481BBacc7938d2D3673590B92647AE',
  },
  routerAddress: {
    [Blockchain.Ethereum.Network.MAIN]: '0x7a517e8bd374565615c043C32760ba4BD9982219',
    [Blockchain.Ethereum.Network.RINKEBY]: '0xFC6c6e4727DA5E1bF79aC9C96155B4cD2faC54E6',
    [Blockchain.Polygon.Network.MAIN]: '0x125488d05fe1D48A8B9053b7C1B021aEF08f1c02',
    [Blockchain.Arbitrum.Network.MAINNET]: '0x194af05afa4ae2f8411c80056e146f6397436b58',
    [Blockchain.Avalanche.Network.MAINNET]: '0x87a3606fd8cb685e72259a25e760df62c3597a26',
  },
  repayRouterAddress: {
    [Blockchain.Ethereum.Network.MAIN]: '0x2B5DC8223D0aD809607f36a1D8A3A11bf20d595e',
    [Blockchain.Ethereum.Network.RINKEBY]: '0xFC6c6e4727DA5E1bF79aC9C96155B4cD2faC54E6',
    [Blockchain.Polygon.Network.MAIN]: '0x125488d05fe1D48A8B9053b7C1B021aEF08f1c02',
    [Blockchain.Arbitrum.Network.MAINNET]: '0x194af05afa4ae2f8411c80056e146f6397436b58',
    [Blockchain.Avalanche.Network.MAINNET]: '0x87a3606fd8cb685e72259a25e760df62c3597a26',
  },
  rolloverAddress: {
    [Blockchain.Ethereum.Network.MAIN]: '0xA5835dB17E67c8D55c472Bb1B1711ccf4D91Bcd6',
    [Blockchain.Ethereum.Network.RINKEBY]: '0xC796d62fB1927a13D7E41eBd0c8eA80fdA5Ef80a',
    [Blockchain.Polygon.Network.MAIN]: '0x03542e5D86e39304FE347c779De78F3157ca3e6f',
    [Blockchain.Arbitrum.Network.MAINNET]: '0x86db5a0feB709199AF6686c71c19cD17057Bd55E',
    [Blockchain.Avalanche.Network.MAINNET]: '0x346290665dac6ed42fa3d80c443215a4311f8ac0',
  },
  poolHelperAddress: {
    [Blockchain.Ethereum.Network.MAIN]: process.env.SENTRY_ENVIRONMENT !== 'prod' ? '0x979F81e74609A589623a3250147AEc3423A8483D' : '0x0aab1368f6704e8403105162690bdf6ee75305c0',
    [Blockchain.Polygon.Network.MAIN]: process.env.SENTRY_ENVIRONMENT !== 'prod' ? '0x5EAD97b1171B1062A2740a1e972BE8fdC7C23701' : '0xd8785Fa74dc7D94558c62D0ba9e6452437aC967B',
    [Blockchain.Arbitrum.Network.MAINNET]: process.env.SENTRY_ENVIRONMENT !== 'prod' ? '0xE2d2f74FA11B9F60bc8D887e0861fb162a6DAc7f' : '0x078Cc37f3039A8bf52544Ab66e410e6D777cAdF1',
    [Blockchain.Avalanche.Network.MAINNET]: process.env.SENTRY_ENVIRONMENT !== 'prod' ? '0xe56113f2FEC5B57337e337F9782a2dcaD19706f7' : '0x3E1Df1C191e621b38148566ec67B210bc2705981',
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
  tenors: process.env.SENTRY_ENVIRONMENT !== 'prod' ? [0.007, 7, 14] : [7, 14],
  tests: {
    walletAddress: process.env.TESTS_WALLET_ADDRESS ?? '',
    privateKey: process.env.TESTS_WALLET_PRIVATE_KEY ?? '',
    whaleWalletAddresses: _.compact((process.env.TESTS_WHALE_WALLET_ADDRESSES ?? '').split(',')),
  },
  signer: process.env.SIGNER,
  looksrareAPIUrl: {
    [Blockchain.Ethereum.Network.MAIN]: process.env.LOOKSRARE_API_URL_MAINNET ?? 'https://api.looksrare.org/',
    [Blockchain.Ethereum.Network.GOERLI]: process.env.LOOKSRARE_API_URL_GOERLI ?? 'https://api-goerli.looksrare.org/',
  },
  wethAddress: {
    [Blockchain.Ethereum.Network.MAIN]: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    [Blockchain.Ethereum.Network.GOERLI]: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
    [Blockchain.Polygon.Network.MAIN]: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    [Blockchain.Arbitrum.Network.MAINNET]: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    [Blockchain.Avalanche.Network.MAINNET]: '0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab',
  },
  sentryApiDsn: process.env.SENTRY_API_DSN,
  alchemySigningKey: process.env.ALCHEMY_SIGNING_KEY ?? '',
  incentiveRewards: 0, // rewards amount for incentive
  stakingRewards: 41666, // rewards amount for staking
  bidTreasuryContractAddress: {
    [Blockchain.Ethereum.Network.MAIN]: '',
    [Blockchain.Ethereum.Network.GOERLI]: '0x9e70ef3cd5565f4eb78996eb037765d759cc257b',
  },
  redisHost: process.env.REDISHOST ? `redis://${process.env.REDISHOST}:6379` : 'redis://localhost:6379',
  redisAuthKey: process.env.REDIS_AUTH_KEY,
  reservoirCollectionSetId: {
    [Blockchain.Ethereum.Network.MAIN]: process.env.RESERVOIR_COLLECTION_SET_ID_MAINNET,
    [Blockchain.Polygon.Network.MAIN]: process.env.RESERVOIR_COLLECTION_SET_ID_POLYGON,
    [Blockchain.Arbitrum.Network.MAINNET]: process.env.RESERVOIR_COLLECTION_SET_ID_ARBITRUM,
    [Blockchain.Avalanche.Network.MAINNET]: process.env.RESERVOIR_COLLECTION_SET_ID_AVALANCHE,
  },
}
