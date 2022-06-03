import axios from 'axios'
import _ from 'lodash'
import { findAll as findAllPools } from '../db/pools'
import Blockchain from '../entities/lib/Blockchain'
import failure from '../utils/failure'
import getLoanEvent from './getLoanEvent'
import getNFTMetadata from './getNFTMetadata'
import getNFTsByOwner from './getNFTsByOwner'
import { findOne as findOneCollection } from '../db/collections'
import NFT from '../entities/lib/NFT'
import EthereumNetwork from '../entities/lib/EthereumNetwork'

type Params = {
  blockchain: Blockchain
  borrowerAddress: string
}

const APIURL = 'https://api.thegraph.com/subgraphs/name/pinedefi/open-loans'

const tokensQuery = (borrower: string) => (
  {
    operationName: 'openLoans',
    query: `query {
      loans(where: {borrower: "${borrower}"}) {
        erc721
        id
        pool
      }
    }`,
    variables: {},
  }
)

export default async function getObligations({ blockchain, borrowerAddress }: Params) {
  let nfts: NFT[]
  if (blockchain.networkId === EthereumNetwork.MAIN) {
    const { data: { data: { loans } } } = await axios.post(APIURL, tokensQuery(borrowerAddress))

    nfts = await Promise.all(loans.map(async (loan: any) => ({
      collection: await findOneCollection({ address: loan.erc721 }),
      id: loan.id.split('/')[1],
    })))
  }
  else {
    const pools = await findAllPools({ blockchains: { [blockchain.network]: blockchain.networkId }, includeRetired: true })
    const allCollaterals = _.flatten(await Promise.all(pools.map((pool, index) => getNFTsByOwner({ blockchain, ownerAddress: pool.address, populateMetadata: false, index }))))
    const allEvents = await Promise.all(allCollaterals.map(collateral => {
      if (!collateral.ownerAddress) throw failure('FETCH_LOAN_EVENTS_FAILURE')
      return getLoanEvent({ blockchain, nftId: collateral.id, poolAddress: collateral.ownerAddress })
    }))

    nfts = _.compact(allEvents.map((event, idx) => borrowerAddress.toLowerCase() !== _.get(event, 'borrower')?.toLowerCase() ? undefined : allCollaterals[idx]))
  }

  // TODO: Optimize this. Currently doing this in series to avoid 429 for some API calls.
  for (let i = 0, n = nfts.length; i < n; i++) {
    const metadata = await getNFTMetadata({ blockchain, nftId: nfts[i].id, collectionAddress: nfts[i].collection.address })
    nfts[i] = {
      ...nfts[i],
      ...metadata,
    }
  }

  return nfts
}
