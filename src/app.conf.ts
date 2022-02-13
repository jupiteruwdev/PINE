export default {
  env: process.env.NODE_ENV ?? 'development',
  port: process.env.PORT ?? 8080,
  openseaAPIKey: process.env.OPENSEA_API_KEY,
  ethRPC: {
    4: process.env.DEV_ETH_RPC || 'https://eth-rinkeby.alchemyapi.io/v2/AaPDVRtDgMMEUS2n1QoCqvNiPfoTQBtY',
    1: process.env.ETH_RPC || 'https://eth-mainnet.alchemyapi.io/v2/g_ET8fSTLVWUaq7vT28FLn9xYITMcSUF',
  },
  ethValuationExpiryBlocks: 64, // quote expires in 15 mins
  ethValuationSigner: process.env.VALUATION_SIGNER,
}
