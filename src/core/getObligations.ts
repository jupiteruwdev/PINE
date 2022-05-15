import axios from 'axios'
import _ from 'lodash'
import { findAll as findAllPools } from '../db/pools'
import Blockchain from '../entities/lib/Blockchain'
import failure from '../utils/failure'
import getRequest from '../utils/getRequest'
import getLoanEvent from './getLoanEvent'
import getNFTMetadata from './getNFTMetadata'
import getNFTsByOwner from './getNFTsByOwner'
import { findOne as findOneCollection } from '../db/collections'
import NFT from '../entities/lib/NFT'

type Params = {
  blockchain: Blockchain
  borrowerAddress: string
}

const APIURL = 'https://api.thegraph.com/subgraphs/name/pinedefi/open-loans'

const tokensQuery = (borrower: string) => JSON.stringify(
{
  "operationName": "openLoans",
  "query": `query {
    loans(where: {borrower: "${borrower}"}) {
      erc721
      id
    }
  }`,
  "variables": {}
})

export default async function getObligations({ blockchain, borrowerAddress }: Params) {
  const pools = await findAllPools({ blockchains: { [blockchain.network]: blockchain.networkId }, includeRetired: true })
  const { data: {data: { loans } } } = await axios.post(APIURL, tokensQuery(borrowerAddress))
  console.log(loans)
  const nfts: NFT[] = await Promise.all(loans.map(async (loan: any) => {
    return {
      collection: await findOneCollection({ address: loan.erc721 }),
      id: loan.id.split('/')[1]
    }
  }))

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
