import dotenv from 'dotenv'
dotenv.config()
export default {
  ethPoolAddress: process.env.ETH_POOL || '0xBF439a8337B9805Ca0BFCCaCEc08E3B0292F5143',
  ethRPC: {
    4: process.env.DEV_ETH_RPC || 'https://rinkeby.infura.io/v3/fad40c6991a64c0db19de9420e2ace3f',
    1: process.env.ETH_RPC || 'https://mainnet.infura.io/v3/fad40c6991a64c0db19de9420e2ace3f',
  },
  v1pools: [
    '0xc07ff956c81961f6f0bfe65e27d149235a3535ac',
    '0x95D4273ee48b58808921BDd6B696eed0cA423F86',
    '0xcd1dd26f7c8ce04fd55b379bb30246e2ac950d18',
    '0xcAed49B77aD08345fBa620A10CA4E4915a9c6f56',
    '0x8045f270e9C12377C76f3478Cc08213Bac771f94',
    '0xf02A3a0D4098Ae9183ad84CdA79314ed8661b702',
  ],
}
