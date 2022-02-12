export default {
  env: process.env.NODE_ENV ?? 'development',
  port: process.env.PORT ?? 8080,
  openseaAPIKey: process.env.OPENSEA_API_KEY,
  ethRPC: {
    4: process.env.DEV_ETH_RPC || 'https://rinkeby.infura.io/v3/fad40c6991a64c0db19de9420e2ace3f',
    1: process.env.ETH_RPC || 'https://mainnet.infura.io/v3/fad40c6991a64c0db19de9420e2ace3f',
  },
  ethValuationExpiryBlocks: 64, // quote expires in 15 mins
  ethValuationSigner: process.env.VALUATION_SIGNER,
}
