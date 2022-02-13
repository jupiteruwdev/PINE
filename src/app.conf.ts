import 'dotenv/config'

export default {
  env: process.env.NODE_ENV ?? 'development',
  port: process.env.PORT ?? 8080,
  openseaAPIKey: process.env.OPENSEA_API_KEY,
  ethRPC: {
    4: process.env.ETH_RPC_RINKEBY,
    1: process.env.ETH_RPC_MAINNET,
  },
  ethValuationExpiryBlocks: 64, // quote expires in 15 mins
  ethValuationSigner: process.env.VALUATION_SIGNER,
}
