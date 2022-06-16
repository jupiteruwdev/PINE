import _ from 'lodash'
import { findOne as findOneCollection } from '../db/collections'
import { findAll as findAllPools } from '../db/pools'
import { Blockchain, EthereumNetwork } from '../entities'
import { CollateralizedNFT } from '../entities/lib/CollateralizedNFT'
import { getOpenLoan } from '../subgraph/request'
import failure from '../utils/failure'
import getLoanEvent from './getLoanEvent'
import getNFTMetadata from './getNFTMetadata'
import getNFTsByOwner from './getNFTsByOwner'

type Params = {
  blockchain: Blockchain
  borrowerAddress: string
}

export default async function getObligations({ blockchain, borrowerAddress }: Params) {
  let nfts: CollateralizedNFT[]
  if (blockchain.networkId === EthereumNetwork.MAIN) {
    const { loans } = await getOpenLoan({ borrower: borrowerAddress })

    nfts = await Promise.all(loans.map(async (loan: any) => ({
      collection: await findOneCollection({ address: loan.erc721 }),
      id: loan.id.split('/')[1],
      loanExpireTimestamp: loan.loanExpiretimestamp,
    })))
  }
  else {
    const pools = await findAllPools({ blockchainFilter: { [blockchain.network]: blockchain.networkId }, includeRetired: true })
    const allCollaterals = _.flatten(await Promise.all(pools.map((pool, index) => getNFTsByOwner({ blockchain, ownerAddress: pool.address, populateMetadata: false, index }))))
    const allEvents = await Promise.all(allCollaterals.map(collateral => {
      if (!collateral.ownerAddress) throw failure('FETCH_LOAN_EVENTS_FAILURE')
      return getLoanEvent({ blockchain, nftId: collateral.id, poolAddress: collateral.ownerAddress })
    }))

    nfts = _.compact(allEvents.map((event, idx) => borrowerAddress.toLowerCase() !== _.get(event, 'borrower')?.toLowerCase() ? undefined : {
      ...allCollaterals[idx],
      loanExpireTimestamp: _.get(event, 'loanExpireTimestamp'),
    }))
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
