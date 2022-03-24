import _ from 'lodash'
import { findAll as findAllPools } from '../db/pools'
import Blockchain from '../entities/lib/Blockchain'
import failure from '../utils/failure'
import getLoanEvent from './getLoanEvent'
import getNFTMetadata from './getNFTMetadata'
import getNFTsByOwner from './getNFTsByOwner'

type Params = {
  blockchain: Blockchain
  borrowerAddress: string
}

export default async function getObligations({ blockchain, borrowerAddress }: Params) {
  const pools = await findAllPools({ blockchains: { [blockchain.network]: blockchain.networkId } })
  const allCollaterals = _.flatten(await Promise.all(pools.map((pool, index) => getNFTsByOwner({ blockchain, ownerAddress: pool.address, populateMetadata: false, index }))))
  const allEvents = await Promise.all(allCollaterals.map(collateral => {
    if (!collateral.ownerAddress) throw failure('FETCH_LOAN_EVENTS_FAILURE')
    return getLoanEvent({ blockchain, nftId: collateral.id, poolAddress: collateral.ownerAddress })
  }))

  const nfts = _.compact(allEvents.map((event, idx) => borrowerAddress.toLowerCase() !== _.get(event, 'borrower')?.toLowerCase() ? undefined : allCollaterals[idx]))

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
