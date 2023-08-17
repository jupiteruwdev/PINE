import BigNumber from 'bignumber.js'
import { expect } from 'chai'
import esmock from 'esmock'

describe('valuations', () => {
  let getRequestStub: any

  beforeEach(async () => {})

  afterEach(() => {
    esmock.purge('../utils/getRequest')
  })

  describe('useReservoir', () => {
    it('should fetch collection valuation with collection address', async () => {
      const fakeData = {
        'collections': [
          {
            'id': '0x960b7a6bcd451c9968473f7bbfd9be826efd549a',
            'slug': 'onchainmonkey',
            'createdAt': '2022-02-09T21:14:55.092Z',
            'name': 'OnChainMonkey',
            'image': 'https://i.seadn.io/gcs/files/9e95b0ff4591b3bc5da1a0bf78d03088.gif?w=500&auto=format',
            'banner': 'https://i.seadn.io/gae/3T2A9ZAKKL3DU78upgMC2sWBRmg6RYZFrgSnPPvXzMfPReyuJ0uSUzMW08JbSaVNzx0P3L5HtFnI4NcJ_fyoHpKn_uaET2PSssneRQ?w=500&auto=format',
            'discordUrl': 'https://discord.gg/ocm',
            'externalUrl': 'https://onchainmonkey.com/',
            'twitterUsername': 'OnChainMonkey',
            'openseaVerificationStatus': 'verified',
            'description': "The first 10K on-chain collection officially on both BTC and ETH. Buy a Genesis = own a BTC Ordinal.\n\nPurchasing an OCM Genesis on Ethereum grants you ownership of this scarce and historic asset on both Ethereum and Bitcoin simultaneously. And it doesn't stop there. OCM Genesis is your passport to our wealthy digital nation, in which we are building wealth for our holders and have numerous launches coming in 2023!\n\nOCM Desserts can be eaten (burned) by Genesis to create the Karma. Type D1 will create a Karma1 and type D2 will create a Karma2.\n\nKarma: https://opensea.io/collection/karma-monkey\n\nDesserts: https://opensea.io/collection/ocm-dessert",
            'sampleImages': [
              'https://openseauserdata.com/files/3f27c6d989faec412d849937f55e3707.svg',
              'https://openseauserdata.com/files/a8484df48c0bb2591aa0b8aae60de322.svg',
              'https://openseauserdata.com/files/743cfcf8399f49a0c03c99a3ed64f64b.svg',
              'https://openseauserdata.com/files/780ce708f91c79620584ca141ceb05d5.svg',
            ],
            'tokenCount': '9500',
            'onSaleCount': '175',
            'primaryContract': '0x960b7a6bcd451c9968473f7bbfd9be826efd549a',
            'tokenSetId': 'contract:0x960b7a6bcd451c9968473f7bbfd9be826efd549a',
            'royalties': {
              'recipient': '0x798a07190b529a7beaa0b64f86865dede0f33500',
              'breakdown': [
                {
                  'bps': 1000,
                  'recipient': '0x798a07190b529a7beaa0b64f86865dede0f33500',
                },
              ],
              'bps': 1000,
            },
            'allRoyalties': {
              'eip2981': [
                {
                  'bps': 1000,
                  'recipient': '0x798a07190b529a7beaa0b64f86865dede0f33500',
                },
              ],
              'onchain': [
                {
                  'bps': 1000,
                  'recipient': '0x798a07190b529a7beaa0b64f86865dede0f33500',
                },
              ],
              'opensea': [
                {
                  'bps': 1000,
                  'recipient': '0x798a07190b529a7beaa0b64f86865dede0f33500',
                },
              ],
            },
            'lastBuy': {
              'value': null,
            },
            'floorAsk': {
              'id': '0xda90c90ad560f0cc7c82aa041eb02beedc0493af40062e678cc10b54097e5e65',
              'sourceDomain': 'blur.io',
              'price': {
                'currency': {
                  'contract': '0x0000000000000000000000000000000000000000',
                  'name': 'Ether',
                  'symbol': 'ETH',
                  'decimals': 18,
                },
                'amount': {
                  'raw': '999998000000000000',
                  'decimal': 1,
                  'usd': 1809.45685,
                  'native': 1,
                },
              },
              'maker': '0xbb41dd49254e8b9d631b835062392a460081734d',
              'validFrom': 1692271718,
              'validUntil': 0,
              'token': {
                'contract': '0x960b7a6bcd451c9968473f7bbfd9be826efd549a',
                'tokenId': '3681',
                'name': 'OnChain Monkey #3681',
                'image': 'https://openseauserdata.com/files/d8d3f7ad35f4bdbb625d0c0e84e8cf33.svg',
              },
            },
            'rank': {
              '1day': 20,
              '7day': 106,
              '30day': 113,
              'allTime': 133,
            },
            'volume': {
              '1day': 57.2883,
              '7day': 107.411,
              '30day': 318.0658,
              'allTime': 20394.56039,
            },
            'volumeChange': {
              '1day': 4.193872854602698,
              '7day': 1.7005368253991122,
              '30day': 0.7116994776144326,
            },
            'floorSale': {
              '1day': 0.95,
              '7day': 1.26,
              '30day': 1.33,
            },
            'floorSaleChange': {
              '1day': 1.0526294736842106,
              '7day': 0.7936492063492063,
              '30day': 0.7518781954887218,
            },
            'collectionBidSupported': true,
            'ownerCount': 2924,
            'contractKind': 'erc721',
            'mintedTimestamp': null,
            'mintStages': [],
          },
        ],
      }
      getRequestStub = async () => fakeData
      const { useReservoir } = await esmock('./getCollectionValuation', { '../utils/getRequest': getRequestStub })
      const valuation = await useReservoir({ collectionAddress: 'test', apiBaseUrl: 'test', apiKey: 'test' })

      expect(valuation.value.amount).to.eql(new BigNumber(1))
      expect(valuation.value.currency).to.eql('ETH')
    })

    it('should fetch collection valuation with collection address and nftId', async () => {
      const tokenFakeData = {
        'tokens': [
          {
            'token': {
              'contract': '0x059edd72cd353df5106d2b9cc5ab83a52287ac3a',
              'tokenId': '9472',
              'name': 'Chromie Squiggle #9472',
              'description': 'Simple and easily identifiable, each squiggle embodies the soul of the Art Blocks platform. Consider each my personal signature as an artist, developer, and tinkerer. Public minting of the Chromie Squiggle is permanently paused. They are now reserved for manual distribution to collectors and community members over a longer period of time. Please visit OpenSea to explore Squiggles available on the secondary market.',
              'image': 'https://i.seadn.io/gcs/files/49a0bee970d9afffce379f14b1ae1176.png?w=500&auto=format',
              'imageSmall': 'https://i.seadn.io/gcs/files/49a0bee970d9afffce379f14b1ae1176.png?w=250&auto=format',
              'imageLarge': 'https://i.seadn.io/gcs/files/49a0bee970d9afffce379f14b1ae1176.png?w=1000&auto=format',
              'media': 'https://generator.artblocks.io/0x059edd72cd353df5106d2b9cc5ab83a52287ac3a/9472',
              'kind': 'erc721',
              'isFlagged': false,
              'lastFlagUpdate': '2023-05-27T23:45:48.936Z',
              'lastFlagChange': null,
              'supply': '1',
              'remainingSupply': '1',
              'rarity': 30.964,
              'rarityRank': 4040,
              'collection': {
                'id': '0x059edd72cd353df5106d2b9cc5ab83a52287ac3a:0:999999',
                'name': 'Chromie Squiggle by Snowfro',
                'image': 'https://i.seadn.io/gae/0qG8Y78s198F2GZHhURw8_TEfxFlpS2XYnuLV_OW6TJin5AV1G2WOSpcLGnEmv5g2gZ6R6Pxjd4v1DP2p0bxptckM6ZJ3cMIvQmrgDM?w=500&auto=format',
                'slug': 'chromie-squiggle-by-snowfro',
                'creator': '0xb998a2520907ed1fc0f9f457b2219fb2720466cd',
                'tokenCount': 9932,
              },
              'owner': '0xacd6508a7a89bdd70b406d8d9419fd606354d889',
            },
            'market': {
              'floorAsk': {
                'id': null,
                'price': null,
                'maker': null,
                'validFrom': null,
                'validUntil': null,
                'source': {},
              },
            },
          },
        ],
        'continuation': null,
      }

      const fakeData = {
        'collections': [
          {
            'id': '0x059edd72cd353df5106d2b9cc5ab83a52287ac3a:0:999999',
            'slug': 'chromie-squiggle-by-snowfro',
            'createdAt': '2022-02-12T23:31:08.732Z',
            'name': 'Chromie Squiggle by Snowfro',
            'image': 'https://i.seadn.io/gae/0qG8Y78s198F2GZHhURw8_TEfxFlpS2XYnuLV_OW6TJin5AV1G2WOSpcLGnEmv5g2gZ6R6Pxjd4v1DP2p0bxptckM6ZJ3cMIvQmrgDM?w=500&auto=format',
            'banner': 'https://i.seadn.io/gcs/files/ef2c459a8ae055f06e76a22d8b1c468c.jpg?w=500&auto=format',
            'discordUrl': null,
            'externalUrl': 'https://www.twitter.com/artonblockchain',
            'twitterUsername': 'artblocks_io',
            'openseaVerificationStatus': 'verified',
            'description': 'Simple and easily identifiable, each squiggle embodies the soul of the Art Blocks platform. Consider each my personal signature as an artist, developer, and tinkerer. Public minting of the Chromie Squiggle is permanently paused. They are now reserved for manual distribution to collectors and community members over a longer period of time. Please visit OpenSea to explore Squiggles available on the secondary market. ',
            'sampleImages': [
              'https://i.seadn.io/gcs/files/31f8769aee493b15ecd7f5e90cca3c49.png?w=500&auto=format',
              'https://i.seadn.io/gcs/files/650180898a6d5f2a53f41b2e27dba264.png?w=500&auto=format',
              'https://i.seadn.io/gcs/files/f92b4aae539b406b80e5ab1c67caa9d0.png?w=500&auto=format',
              'https://i.seadn.io/gcs/files/27c86fced815762e7da69b08fc74b9a6.png?w=500&auto=format',
            ],
            'tokenCount': '9932',
            'onSaleCount': '191',
            'primaryContract': '0x059edd72cd353df5106d2b9cc5ab83a52287ac3a',
            'tokenSetId': 'range:0x059edd72cd353df5106d2b9cc5ab83a52287ac3a:0:999999',
            'creator': '0xb998a2520907ed1fc0f9f457b2219fb2720466cd',
            'royalties': {
              'recipient': '0xf3860788d1597cecf938424baabe976fac87dc26',
              'breakdown': [
                {
                  'bps': 500,
                  'recipient': '0xf3860788d1597cecf938424baabe976fac87dc26',
                },
                {
                  'bps': 250,
                  'recipient': '0xc40fd6d2a8e06ba753f6fd3cb562835eff990b51',
                },
              ],
              'bps': 750,
            },
            'allRoyalties': {
              'onchain': [
                {
                  'bps': 500,
                  'recipient': '0xf3860788d1597cecf938424baabe976fac87dc26',
                },
                {
                  'bps': 250,
                  'recipient': '0xc40fd6d2a8e06ba753f6fd3cb562835eff990b51',
                },
              ],
              'opensea': [
                {
                  'bps': 750,
                  'recipient': '0x6c093fe8bc59e1e0cae2ec10f0b717d3d182056b',
                },
              ],
              'artblocks': [
                {
                  'bps': 500,
                  'recipient': '0xf3860788d1597cecf938424baabe976fac87dc26',
                },
                {
                  'bps': 250,
                  'recipient': '0x05b0658c6d0ed423e39da60f8feddd460d838f5f',
                },
              ],
            },
            'floorAsk': {
              'id': '0xfdd4a6701dc9563f6b8c581433de163e8c02669c05119869be67694e151506f3',
              'sourceDomain': 'opensea.io',
              'price': {
                'currency': {
                  'contract': '0x0000000000000000000000000000000000000000',
                  'name': 'Ether',
                  'symbol': 'ETH',
                  'decimals': 18,
                },
                'amount': {
                  'raw': '10400000000000000000',
                  'decimal': 10.4,
                  'usd': 18818.38893,
                  'native': 10.4,
                },
              },
              'maker': '0xa5e21f230c9ad9300e5e540319de099aa5448342',
              'validFrom': 1692218733,
              'validUntil': 1706050408,
              'token': {
                'contract': '0x059edd72cd353df5106d2b9cc5ab83a52287ac3a',
                'tokenId': '9219',
                'name': 'Chromie Squiggle #9219',
                'image': 'https://i.seadn.io/gcs/files/15125cfb46282d1ee42040dd31863ab9.png?w=500&auto=format',
              },
            },
            'topBid': {
              'id': '0xe494d0e10108aeb75062d40e5d8564adde9c4d6f8f60e941d0dce2b2446bb279',
              'sourceDomain': 'opensea.io',
              'price': {
                'currency': {
                  'contract': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                  'name': 'Wrapped Ether',
                  'symbol': 'WETH',
                  'decimals': 18,
                },
                'amount': {
                  'raw': '9600000000000000000',
                  'decimal': 9.6,
                  'usd': 17350.18025,
                  'native': 9.6,
                },
                'netAmount': {
                  'raw': '9360000000000000000',
                  'decimal': 9.36,
                  'usd': 16916.42575,
                  'native': 9.36,
                },
              },
              'maker': '0x39974e437255c4a2f888ca4f18109ea5fa8ea74e',
              'validFrom': 1692125548,
              'validUntil': 1692730344,
            },
            'rank': {
              '1day': 26,
              '7day': 13,
              '30day': 53,
              'allTime': 29,
            },
            'volume': {
              '1day': 33.08,
              '7day': 371.1268,
              '30day': 1105.49258,
              'allTime': 72762.71259,
            },
            'volumeChange': {
              '1day': 0.36074272871121715,
              '7day': 1.5659946723737728,
              '30day': 0.9842220788950092,
            },
            'floorSale': {
              '1day': 16.2,
              '7day': 10.0007,
              '30day': 12.69,
            },
            'floorSaleChange': {
              '1day': 0.6419753086419753,
              '7day': 1.0399272050956434,
              '30day': 0.8195429472025216,
            },
            'collectionBidSupported': true,
            'ownerCount': 2917,
            'contractKind': 'erc721',
            'mintedTimestamp': null,
            'mintStages': [],
          },
        ],
      }
      getRequestStub = async (url: string) => {
        if (url.includes('tokens')) {
          return tokenFakeData
        }
        return fakeData
      }
      const { useReservoir } = await esmock('./getCollectionValuation', { '../utils/getRequest': getRequestStub })
      const valuation = await useReservoir({ collectionAddress: 'test', apiBaseUrl: 'test', apiKey: 'test', nftId: 'test' })

      expect(valuation.value.amount).to.eql(new BigNumber(10.4))
      expect(valuation.value.currency).to.eql('ETH')
    })
  })
})
