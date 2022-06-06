/* eslint-disable */

import Currency, { AnyCurrency } from "../entities/lib/Currency"
import Fee from "../entities/lib/Fee"
import { $ETH } from "../entities/lib/Value"

// TODO: remove hack!
export const routerAddresses : { [key: number]: any } = { 4: '0xFC6c6e4727DA5E1bF79aC9C96155B4cD2faC54E6', 1: '0x774badBc759234Bff52B0Be11bF61Bb68c9E9A24' }

export const rolloverAddresses : { [key: number]: any } = { 4:'0x99fb87BA6DCfaD039587aD4683EeAA3F263dfB02', 1: '0x33dA4AB55Bbf69Bf5cFa28468AbA2C775Ea2364F' }

export const repayRouterAddresses = (x: number, poolAddress: string) => {
  const y : { [key: number]: any }  = { 4: '0xFC6c6e4727DA5E1bF79aC9C96155B4cD2faC54E6', 1: '0x1E23F78896F6d4F0e25D7bcD49bb2f7eee62EF98' }
  if (poolAddress.toLowerCase() === '0xbc7EbB061235994f360aD3E3ca9de0264443ED6a'.toLowerCase() || poolAddress.toLowerCase() === '0x4dE7B2f8160fa083F90d4900eAe448dbc9ABb1C8'.toLowerCase()) return '0x66a13171B0A3D6F7009eC21D224F6b491b8772f3'
  if (poolAddress.toLowerCase() === '0x4286f77da706339A631c9578278b99a254156D10'.toLowerCase()) return  '0x774badBc759234Bff52B0Be11bF61Bb68c9E9A24'
  else return y[x]
}

export const defaultFees = (currency: AnyCurrency, poolVersion: number, poolAddress: string): Fee[] => {
  if (currency === 'ETH' && poolVersion > 1) return [
    {
      type: 'fixed',
      value: $ETH(0.01),
    },
    {
      type: 'percentage',
      value: 0.0035,
    }
  ]
  
  return []
}

export const supportedCollections: { [key: string]: any } = {
  'opensea:doodles-official': {
    display_name: 'Doodles',
    address: '0x8a90cab2b38dba80c64b7734e58ee1db38b8992e',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/7B0qai02OdHA8P_EOVK672qUliyjQdQDGNrACxs7WnTgZAkJa_wWURnIFKeOh5VTf8cfTqW3wQpozGedaC9mteKphEOtztls02RlWQ=s130',
    lendingPools: [
      {
        address: '0xAe139B2C530fAb436ebe180c0B41a78382B2D0Bb',
        loan_options: [
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00156,
            interest_bps_block_override: 0.000600,
            max_ltv_bps: 4000,
          },
        ],
      },
      {
        address: '0x4286f77da706339A631c9578278b99a254156D10',
        retired: true,
        loan_options: [
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00156,
            interest_bps_block_override: 0.000600,
            max_ltv_bps: 3300,
          },
        ],
      },
    ],
  },
  'opensea:dourdarcels': {
    display_name: 'DourDarcels',
    address: '0x8d609bd201beaea7dccbfbd9c22851e23da68691',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/WxBXXLXUJZwhUMPfz0o18a2gjYpU-qecO-ENOF8QXsfiBLt8TeQ8Nurmi2zLbwgwTHE-J_aZRkIqDA_OGrBSbU7ZpOV8jdjtkp-U4Q=s130',
    lendingPools: [
      {
        address: '0xc65deedc3e0A0aD67012ab503112c60477e5680E',
        loan_options: [
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00138,
            interest_bps_block_override: 0.000172,
            max_ltv_bps: 5000,
          },
        ],
      },
    ],
  },
  'opensea:llamaverse-genesis': {
    display_name: 'Llamaverse Genesis',
    address: '0x9df8aa7c681f33e442a0d57b838555da863504f3',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/I-ef-zrbXTLC8w38vOFCRGnaJyRkyYxHNgb7yNE8g_POI7O1UAo0yDEQIaCtf_eEDdovFkCP9nyDGFpjtOD8T6-JSs0HLqbGSDtdNLo=s130',
    lendingPools: [
      {
        address: '0xd7b018a68A2dc66D6Fd56Dd9F4008CDFD127F287',
        loan_options: [
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00138,
            interest_bps_block_override: 0.000600,
            max_ltv_bps: 3000,
          },
        ],
      },
    ],
  },
  'opensea:genesis-creepz': {
    display_name: 'Creepz Genesis',
    address: '0xfe8c6d19365453d26af321d0e8c910428c23873f',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/r_FGZQ0mgacLAOzH1MxC9n-yyygNmg37QyjYvM3g4HCl1mOkeGif7_8IW62v_R4Tvx9O9EWdHkNmiQQW30DNxwcvuSbg5EM1FQeSDIo=s130',
    lendingPools: [
      {
        address: '0xf9B168fd0bf7BF1A36eD1ad29dd899607eb8023F',
        loan_options: [
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00138,
            interest_bps_block_override: 0.000172,
            max_ltv_bps: 4000,
          },
        ],
      },
    ],
  },
  'opensea:tubby-cats': {
    display_name: 'tubby cats by tubby collective',
    address: '0xca7ca7bcc765f77339be2d648ba53ce9c8a262bd',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/XHZY9623keDQqFSDHKqOdcjD99Y7N82K1egYRM2Mm1Z-Jxn5myrkKiC5NBktWKStVtTzDzwELy9dNpzTWJTIkLsdMIxUHI86jduQ=s130',
    lendingPools: [
      {
        address: '0x1597a81012c4b06d5aB981eAb60aad5B1B933F9a',
        loan_options: [
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00138,
            interest_bps_block_override: 0.000172,
            max_ltv_bps: 5000,
          },
        ],
      },
    ]
  },
  'opensea:murixhaus': {
    display_name: 'MURI by Haus',
    address: '0x4b61413d4392c806e6d0ff5ee91e6073c21d6430',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/OPgdc2e-yuBEMeyS8ttfl8cINQ5amQofP0xS4wWj59bWyUUo84A4g-WaulcpghyQCde1mQh88XABNHWjT9MRhPo34-QF50bdYQZa=s130',
    lendingPools: [
      {
        address: '0x44FF4Be276a599aFFcba9c0ec995E75bCD6b60b7',
        loan_options: [
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00138,
            interest_bps_block_override: 0.000172,
            max_ltv_bps: 5000,
          },
        ],
      },
    ],
  },
  'opensea:proof-moonbirds': {
    display_name: 'Moonbirds',
    address: '0x23581767a106ae21c074b2276d25e5c3e136a68b',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/sn5iLHUcNuUO98w_9Z7cat32hiqvVkPYr6tzHUacESg4PePh9M3jySvpttyWWXHD2e8M4PNQqgorU9sUvpX-FHQHXFBiCpKjloC2nA=s130',
    lendingPools: [
      {
        address: '0xbc7EbB061235994f360aD3E3ca9de0264443ED6a',
        loan_options: [
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00138,
            interest_bps_block_override: 0.000600,
            max_ltv_bps: 3000,
          },
        ],
      },
    ],
  },
  'opensea:sandbox': {
    display_name: 'The Sandbox',
    address: '0x5cc5b05a8a13e3fbdb0bb9fccd98d38e50f90c38',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/SXH8tW1siikB80rwCRnjm1a5xM_MwTg9Xl9Db6mioIk9HIlDM09pVoSR7GKJgS6ulSUpgW9BDtMk_ePX_NKgO9A=s130',
    lendingPools: [
        {
        address: '0x5241a1FA3Ac0C73991A88B506B531b0E1536Bf78',
        loan_options: [
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.000888,
            max_ltv_bps: 3500,
          },
        ],
      },
    ]
  },
  'opensea:wonderpals': {
    display_name: 'WonderPals',
    address: '0x3acce66cd37518a6d77d9ea3039e00b3a2955460',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/DA_iUjt7S9PdmAANh0aqMkxYVhvGogTuKbMSzFO3uEnbvRRt5hn1B8DuN50HQpkRtH34QX7EOYYKIayz1q5KgZWfgLedNo7xBQzK=s130',
    lendingPools: [
        {
        address: '0x654c881c24AA6527e92d9C89B6DaE77356C2CC35',
        loan_options: [
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00138,
            interest_bps_block_override: 0.000172,
            max_ltv_bps: 5000,
          },
        ],
      },
    ],
  },
  'opensea:clonex': {
    display_name: 'CLONE X - X TAKASHI MURAKAMI',
    address: '0x49cf6f5d44e70224e2e23fdcdd2c053f30ada28b',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/XN0XuD8Uh3jyRWNtPTFeXJg_ht8m5ofDx6aHklOiy4amhFuWUa0JaR6It49AH8tlnYS386Q0TW_-Lmedn0UET_ko1a3CbJGeu5iHMg=s130',
    lendingPools: [
        {
        address: '0x7e31f1Dd48A31C4ACAF7D87F5f4B117588488cCb',
        loan_options: [
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00138,
            interest_bps_block_override: 0.000172,
            max_ltv_bps: 4000,
          },
        ],
      },
    ],
  },
  'opensea:otherdeed': {
    display_name: 'Otherdeed for Otherside',
    address: '0x34d85c9cdeb23fa97cb08333b511ac86e1c4e258',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/yIm-M5-BpSDdTEIJRt5D6xphizhIdozXjqSITgK4phWq7MmAU3qE7Nw7POGCiPGyhtJ3ZFP8iJ29TFl-RLcGBWX5qI4-ZcnCPcsY4zI=s130',
    lendingPools: [
      {
        address: '0x5facc5eeB5163E55FdD8B59Df3c8649082bA68Ac',
        loan_options: [
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00138,
            interest_bps_block_override: 0.000600,
            max_ltv_bps: 3000,
          },
        ],
      },
    ],
  },
  'opensea:goblintownwtf': {
    display_name: 'goblintown.wtf',
    address: '0xbce3781ae7ca1a5e050bd9c4c77369867ebc307e',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/cb_wdEAmvry_noTfeuQzhqKpghhZWQ_sEhuGS9swM03UM8QMEVJrndu0ZRdLFgGVqEPeCUzOHGTUllxug9U3xdvt0bES6VFdkRCKPqg=s168',
    lendingPools: [
      {
        address: '0xA905dEA7B63B0f54f633E2Cb8B5814ec91Ec2E84',
        loan_options: [
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00138,
            interest_bps_block_override: 0.000600,
            max_ltv_bps: 3000,
          },
        ],
      },
    ],
  },
  'opensea:world-of-women-galaxy': {
    display_name: 'World of Women Galaxy',
    address: '0xf61f24c2d93bf2de187546b14425bf631f28d6dc',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/hP4JJhiY5yXu1mCvNycTke2O_xbtgIFfkLTjfT7C9TNKinkGpP2COikt7cwn0xqzoATRNC21wsiwy_Fe-MQ3PPTgRjkbbCfJf__L=s130',
    lendingPools: [
      {
        address: '0x732E5339B8E7e3793Bc94F6b2DBaa18ef2591776',
        loan_options: [
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00138,
            interest_bps_block_override: 0.000600,
            max_ltv_bps: 5000,
          },
        ],
      },
    ],
  },
  'opensea:world-of-women-nft': {
    display_name: 'World of Women',
    address: '0xe785e82358879f061bc3dcac6f0444462d4b5330',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/EFAQpIktMBU5SU0TqSdPWZ4byHr3hFirL_mATsR8KWhM5z-GJljX8E73V933lkyKgv2SAFlfRRjGsWvWbQQmJAwu3F2FDXVa1C9F=s130',
    lendingPools: [
        {
        address: '0x00498884D17A7155561D0Faa9876B1a918e13C06',
        loan_options: [
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00138,
            interest_bps_block_override: 0.000600,
            max_ltv_bps: 4000,
          },
        ],
      },
    ],
  },
  'opensea:rich-baby': {
    display_name: 'Rich Baby Official',
    address: '0x78fD3FA3cE045f59eb8C4DC7C21906295a8e3Ab4',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/2PDflxyoUNhZNAPudZy1ridnZDTYII82xkUB_PKrewB2yRB1nPnyKwJhM0mbNzg5OI1s1IhtVf96X3ejFj0KfauCDx3ZyQpWCXJH3Q=s130',
    lendingPools: [
        {
        address: '0xb81D17A19C570e60Ea25A7a7bAe2AA8b27c5Db5c',
        loan_options: [
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00138,
            interest_bps_block_override: 0.000600,
            max_ltv_bps: 3000,
          },
        ],
      },
    ],
  },
  'opensea:cyberbrokers': {
    display_name: 'CyberBrokers',
    address: '0x892848074ddea461a15f337250da3ce55580ca85',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/Qd1IEPYz_0YlMaclPwb6_9PyP7afZIzH15IdIU2X6t1Wvg81DwpAaWOY0cNmxy173C4yMA7sM3xF9-HJsCSKJdx6KvDR3old3IKuTIc=s0',
    lendingPools: [
      {
        retired: true,
        address: '0x56893018a87434E9b1D6af427fF52D6C27f1A542',
        loan_options: [
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00138,
            interest_bps_block_override: 0.000198,
            max_ltv_bps: 4000,
          },
        ],
      },
      {
        address: '0x8c2894650263299972a22bb30e30860543c63c42',
        loan_options: [
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00138,
            interest_bps_block_override: 0.000600,
            max_ltv_bps: 4000,
          },
        ],
      },      
    ],
  },
  'opensea:onchainmonkey': {
    display_name: 'OnChainMonkey',
    address: '0x960b7a6bcd451c9968473f7bbfd9be826efd549a',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/DiZDS55tz4x8hmupgiNQxHHq1kuts0n83RNwpytSpNJ90IKyNxRzDLMVPtCQOBd5IlEjE5nlvwXISh065KHXfOS7F5tS-Dvdh-dTMis=s130',
    lendingPools: [
      {
        address: '0x96007fc943c0A53e21746aD637eEd6Ce0AFA810f',
        loan_options: [
          {
            loan_duration_block: 18513,
            loan_duration_second: 259200,
            interest_bps_block: 0.00156,
            interest_bps_block_override: 0.000209,
            max_ltv_bps: 3469,
          },
          {
            loan_duration_block: 43194,
            loan_duration_second: 604800,
            interest_bps_block: 0.00143,
            interest_bps_block_override: 0.000195,
            max_ltv_bps: 3169,
          },
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00138,
            interest_bps_block_override: 0.000191,
            max_ltv_bps: 2888,
          },
        ],
      },
    ],
  },
  // 'opensea:invisiblefriends': {
  //   display_name: 'Invisible Friends',
  //   address: '0x59468516a8259058bad1ca5f8f4bff190d30e066',
  //   networkType: 'ethereum',
  //   networkId: 1,
  //   image_url: 'https://lh3.googleusercontent.com/lW22aEwUE0IqGaYm5HRiMS8DwkDwsdjPpprEqYnBqo2s7gSR-JqcYOjU9LM6p32ujG_YAEd72aDyox-pdCVK10G-u1qZ3zAsn2r9=s130',
  //   lendingPools: {
  //     address: '0xCF7ED018Ce445141730Eb3Bca43198621eDB660b',
  //     loan_options: [
  //       {
  //         loan_duration_block: 18513,
  //         loan_duration_second: 259200,
  //         interest_bps_block: 0.00156,
  //         interest_bps_block_override: 0.000209,
  //         max_ltv_bps: 3000,
  //       },
  //       {
  //         loan_duration_block: 43194,
  //         loan_duration_second: 604800,
  //         interest_bps_block: 0.00143,
  //         interest_bps_block_override: 0.000191,
  //         max_ltv_bps: 2869,
  //       },
  //     ],
  //   },
  // },
  'opensea:azuki': {
    display_name: 'Azuki',
    address: '0xed5af388653567af2f388e6224dc7c4b3241c544',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/H8jOCJuQokNqGBpkBN5wk1oZwO7LM8bNnrHCaekV2nKjnCqw6UB5oaH8XyNeBDj6bA_n1mjejzhFQUP3O1NfjFLHr3FOaeHcTOOT=s130',
    lendingPools: [
        {
        address: '0x4dE7B2f8160fa083F90d4900eAe448dbc9ABb1C8',
        loan_options: [
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00156,
            interest_bps_block_override: 0.000600,
            max_ltv_bps: 3300,
          },
        ],
      },
    ],
  },
  'opensea:cryptoadz-by-gremplin': {
    display_name: 'CrypToadz by GREMPLIN',
    address: '0x1cb1a5e65610aeff2551a50f76a87a7d3fb649c6',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/iofetZEyiEIGcNyJKpbOafb_efJyeo7QOYnTog8qcQJhqoBU-Vu9l3lXidZhXOAdu6dj4fzWW6BZDU5vLseC-K03rMMu-_j2LvwcbHo=s130',
    lendingPools: [
        {
        address: '0x52e74fd190ded6538202b131d2c8f63569fa3593',
        loan_options: [
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00156,
            interest_bps_block_override: 0.000600,
            max_ltv_bps: 3500,
          },
        ],
      },
    ],
  },
  'opensea:meebits': {
    display_name: 'Meebits',
    address: '0x7bd29408f11d2bfc23c34f18275bbf23bb716bc7',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/d784iHHbqQFVH1XYD6HoT4u3y_Fsu_9FZUltWjnOzoYv7qqB5dLUqpGyHBd8Gq3h4mykK5Enj8pxqOUorgD2PfIWcVj9ugvu8l0=s130',
    lendingPools: [
        {
        address: '0x3783bDf5bCddA4a5e748E6CA7108a26Fb6d5F3F9',
        loan_options: [
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00156,
            interest_bps_block_override: 0.000600,
            max_ltv_bps: 4000,
          },
        ],
      },
    ],
  },
  'opensea:cool-cats-nft': {
    display_name: 'Cool Cats NFT',
    address: '0x1a92f7381b9f03921564a437210bb9396471050c',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/LIov33kogXOK4XZd2ESj29sqm_Hww5JSdO7AFn5wjt8xgnJJ0UpNV9yITqxra3s_LMEW1AnnrgOVB_hDpjJRA1uF4skI5Sdi_9rULi8=s130',
    lendingPools: [
        {
        address: '0x6a8f1D2362EB4df91DEA217D43124A2B77E93E2D',
        loan_options: [
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00156,
            interest_bps_block_override: 0.000600,
            max_ltv_bps: 4000,
          },
        ],
      },
    ],
  },
  'opensea:official-moar-by-joan-cornella': {
    display_name: '"MOAR" by Joan Cornella',
    address: '0xeb3a9a839dfeeaf71db1b4ed6a8ae0ccb171b227',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/4c4dqYwdIhtmAkeKAfwVJEQYaJqwgek3juaUSfTY9lhR--LOj8HyqUBzcXxzrVr-XZiWBk98PRg25Hf7M7Wlff0hLe5Vnq5lx3jFF9c=s130',
    lendingPools: [
        {
        address: '0x7b693823c501e9575ef5c5fbc2aa4206f8c056d4',
        loan_options: [
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00156,
            interest_bps_block_override: 0.000600,
            max_ltv_bps: 3500,
          },
        ],
      },
    ],
  },
  'opensea:chromie-squiggle-by-snowfro': {
    display_name: 'Chromie Squiggle by Snowfro',
    address: '0x059edd72cd353df5106d2b9cc5ab83a52287ac3a',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/m_MpnLUjOsNcpuFavS7NNjA3nWSS08Kv1IIJMHv46Jg_RLtjhuqClN-7MtwezbbdA26F9i50PDG63IyQ_HN7cFRXm4Pl9s0sAA6_=s130',
    lendingPools: [
      {
        address: '0xCa8619bE278D77B3ACD17B2241d35FFbdfB0191b',
        loan_options: [
          {
            loan_duration_block: 185142,
            loan_duration_second: 2592000,
            interest_bps_block: 0.000888,
            max_ltv_bps: 6500,
          },
        ]
      }
    ],
  },
  'opensea:boredapeyachtclub': {
    display_name: 'Bored Ape Yacht Club',
    address: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/Ju9CkWtV-1Okvf45wo8UctR-M9He2PjILP0oOvxE89AyiPPGtrR3gysu1Zgy0hjd2xKIgjJJtWIc0ybj4Vd7wv8t3pxDGHoJBzDB=s130',
    lendingPools: [
      {
        address: '0x90dFb72736481BBacc7938d2D3673590B92647AE',
        loan_options: [
          {
            loan_duration_block: 43194,
            loan_duration_second: 604800,
            interest_bps_block: 0.000888,
            max_ltv_bps: 4000,
          },
        ]
      }
    ],
  },
  // 'opensea:irenedao': {
  //   display_name: 'IreneDAO',
  //   address: '0x13015585932752a8e6dc24be6c07c420381af53d',
  //   networkType: 'ethereum',
  //   networkId: 1,
  //   image_url: 'https://lh3.googleusercontent.com/kr2NzPNWyuQGaPx2KMDT7kHsMCkGSf27fD8pJkg0fEcBCQYitcSo6VMwJIdSWq35P8oveAQ1z7VvROfxY4O9F_sXHfcmm4_wpUEJDw=s130',
  //   lendingPools: {
  //     address: '0x0783Dd1819337664bEa591AB9FF281d12022Fdc0',
  //     loan_options: [
  //       {
  //         loan_duration_block: 18513,
  //         loan_duration_second: 259200,
  //         interest_bps_block: 0.00156,
  //         interest_bps_block_override: 0,
  //         max_ltv_bps: 2800,
  //       },
  //       {
  //         loan_duration_block: 43194,
  //         loan_duration_second: 604800,
  //         interest_bps_block: 0.00143,
  //         interest_bps_block_override: 0.000168,
  //         max_ltv_bps: 2500,
  //       },
  //     ],
  //   },
  // },
  'opensea:pudgypenguins': {
    display_name: 'Pudgy Penguins',
    address: '0xbd3531da5cf5857e7cfaa92426877b022e612cf8',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/bcCd1TfusKK6wWjmshwmizmY9j7An3pp9kxopMxfIt-_I8WFnSIK-5gevOduoYK4Qpq2e3DyXgROKNfkP396W5ViEYXhxoyAZG3s_vY=s130',
    lendingPools: [
      {
        address: '0xC738AB51B98D3d81f11dD12B23A39b6bAD2A5162',
        loan_options: [
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00138,
            interest_bps_block_override: 0.000600,
            max_ltv_bps: 4000,
          },
        ],
      },
    ],
  },
  'opensea:mutant-ape-yacht-club': {
    display_name: 'Mutant Ape Yacht Club',
    address: '0x60e4d786628fea6478f785a6d7e704777c86a7c6',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/lHexKRMpw-aoSyB1WdFBff5yfANLReFxHzt1DOj_sg7mS14yARpuvYcUtsyyx-Nkpk6WTcUPFoG53VnLJezYi8hAs0OxNZwlw6Y-dmI=s130',
    lendingPools: [
      {
        address: '0x9dd5e00105f82137dbfdd808ff5548ae4bb65a0c',
        loan_options: [
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00138,
            interest_bps_block_override: 0.000600,
            max_ltv_bps: 4000,
          },
        ],
      },
    ],
  },
  'opensea:akutars': {
    display_name: 'Akutars',
    address: '0xaaD35C2DadbE77f97301617D82e661776c891Fa9',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/lU7HLkzbdUB07EpfR2wvLkLi8Msc5JyE5d7iDNmgVn3EdnNnNM-2c-027IHP0W8T1t2wH5Hl2gtv90tzF_LdUC6Q-UBYwXpBfMaOCA=s130',
    lendingPools: [
        {
        address: '0xCa91dAc73595C2524842500D68C66de55cf33c52',
        loan_options: [
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00138,
            interest_bps_block_override: 0.000600,
            max_ltv_bps: 3500,
          },
        ],
      },
    ],
  },
  'opensea:worldwidewebbland': {
    display_name: 'Worldwide Webb Land',
    address: '0xA1D4657e0E6507D5a94d06DA93E94dC7C8c44b51',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/Tc7kJNU7hcpmCCykek6ANVhWervl1zhbNIlM_T3VSR1hsSCrOGG6IiNALSs8v-OgUVJvoKW6tVbJWjnJti_o0ihvUNlxFWfZV9V9=s130',
    lendingPools: [
        {
        address: '0xcAed49B77aD08345fBa620A10CA4E4915a9c6f56',
        loan_options: [
          {
            loan_duration_block: 18513,
            loan_duration_second: 259200,
            interest_bps_block: 0.00156,
            interest_bps_block_override: 0.000151,
            max_ltv_bps: 3300,
          },
          {
            loan_duration_block: 43194,
            loan_duration_second: 604800,
            interest_bps_block: 0.00143,
            interest_bps_block_override: 0.000168,
            max_ltv_bps: 2500,
          },
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00138,
            interest_bps_block_override: 0.000160,
            max_ltv_bps: 2300,
          },
        ],
      },
    ],
  },
  'opensea:alienfrensnft': {
    display_name: 'alien frens',
    address: '0x123b30E25973FeCd8354dd5f41Cc45A3065eF88C',
    networkType: 'ethereum',
    networkId: 1,
    image_url: 'https://lh3.googleusercontent.com/_zidXBb2QsMBD6OYdjED63tczeXDUr1ah7zvhSSLHQjU4BF-H-lUexkLJ76_ahmbkkItEiH738jVPG88DOFVdt4GX377cvNNgCyzFT4=s130',
    lendingPools: [
      {
        address: '0x8045f270e9C12377C76f3478Cc08213Bac771f94',
        loan_options: [
          {
            loan_duration_block: 18513,
            loan_duration_second: 259200,
            interest_bps_block: 0.00156,
            interest_bps_block_override: 0.000151,
            max_ltv_bps: 3300,
          },
          {
            loan_duration_block: 43194,
            loan_duration_second: 604800,
            interest_bps_block: 0.00143,
            interest_bps_block_override: 0.000168,
            max_ltv_bps: 2500,
          },
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00138,
            interest_bps_block_override: 0.000160,
            max_ltv_bps: 2300,
          },
        ],
      },
    ],
  },
  'testing': {
    display_name: 'Test Doodles',
    address: '0x44aCF686Ac73A157Cd5fa26A1B6AB713B547dAF5',
    networkType: 'ethereum',
    networkId: 4,
    lendingPools: [
      {
        address: '0x150A1a9015Bfaf54e7199eBb6ae35EBDE755D51D',
        loan_options: [
          {
            loan_duration_block: 6171,
            loan_duration_second: 86400,
            interest_bps_block: 0.00156,
            interest_bps_block_override: 0.00156,
            max_ltv_bps: 5000,
          },
        ],
      },
    ],
  },
  'testing2': {
    display_name: 'Test NFTBank 1',
    address: '0x094069cFab3B64A12fD8F0161F8D804fC6068082',
    networkType: 'ethereum',
    networkId: 4,
    lendingPools: [
      {
        address: '0xC33A8a44604E561d379a38df9Fdc8bD357DCfD26',
        loan_options: [
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00138,
            interest_bps_block_override: 0.000888,
            max_ltv_bps: 5000,
          },
        ],
      },
    ],
  },
  'testing3': {
    display_name: 'Test NFTBank 2',
    address: '0xc5C8Cce493FdF6E0F3BFBDE63FF6c3959d1142b2',
    networkType: 'ethereum',
    networkId: 4,
    lendingPools: [
      {
        address: '0xf948a76e6fC54F04a3de344c15c26CC6e6f6264C',
        loan_options: [
          {
            loan_duration_block: 86388,
            loan_duration_second: 1209600,
            interest_bps_block: 0.00138,
            interest_bps_block_override: 0.000444,
            max_ltv_bps: 5000,
          },
        ],
      },
    ],
  },
  // 'robotos-official': {
  //     display_name: 'Robotos',
  //     address: '0x099689220846644F87D1137665CDED7BF3422747',
  //     networkType: 'ethereum',
  //     networkId: 1
  // },
  // 'fluf-world': {
  //     display_name: 'Fluf World',
  //     address: '0xCcc441ac31f02cD96C153DB6fd5Fe0a2F4e6A68d',
  //     networkType: 'ethereum',
  //     networkId: 1
  // },
  // meebits: {
  //     display_name: 'Meebits',
  //     address: '0x7Bd29408f11D2bFC23c34f18275bBf23bB716Bc7',
  //     networkType: 'ethereum',
  //     networkId: 1
  // },
  // testing: {
  //     display_name: 'Test watches',
  //     address: '0xe587ABF8Fce0a1c266952ba3163B442640481706',
  //     networkType: 'ethereum',
  //     networkId: 4
  // }

}
