import dotenv from 'dotenv'
dotenv.config()
export default {
    ethPoolAddress: process.env.ETH_POOL || '0xBF439a8337B9805Ca0BFCCaCEc08E3B0292F5143',
    ethRPC: process.env.ETH_RPC || 'https://rinkeby.infura.io/v3/fad40c6991a64c0db19de9420e2ace3f'
}