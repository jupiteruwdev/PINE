import _ from 'lodash'
import { Blockchain, CollateralizedNFT } from '../../entities'
import { getOnChainLoanByBorrower } from '../../subgraph'
import fault from '../../utils/fault'
import { getNFTMetadata, getNFTsByOwner } from '../collaterals'
import { getCollection } from '../collections'
import { searchPools } from '../pools'
import getLoanEvent from './getLoanEvent'

type Params = {
  blockchain: Blockchain
  borrowerAddress: string
}

export default async function getObligations({ blockchain, borrowerAddress }: Params) {
  let nfts: CollateralizedNFT[]
  if (blockchain.networkId === Blockchain.Ethereum.Network.MAIN) {
    const { loans } = await getOnChainLoanByBorrower({ borrowerAddress }, { networkId: blockchain.networkId })

    nfts = await Promise.all(loans.map(async (loan: any) => ({
      collection: await getCollection({ address: loan.erc721, nftId: loan.id.split('/')[1] }),
      id: loan.id.split('/')[1],
      loanExpireTimestamp: loan.loanExpiretimestamp,
    })))
  }
  else {
    const pools = await searchPools({ blockchainFilter: { [blockchain.network]: blockchain.networkId }, includeRetired: true })
    const allCollaterals = _.flatten(await Promise.all(pools.map((pool, index) => getNFTsByOwner({ blockchain, ownerAddress: pool.address, populateMetadata: false, index }))))
    const allEvents = await Promise.all(allCollaterals.map(collateral => {
      if (!collateral.ownerAddress) throw fault('ERR_FETCH_LOAN_EVENTS')
      return getLoanEvent({ blockchain, nftId: collateral.id, poolAddress: collateral.ownerAddress })
    }))

    nfts = _.compact(allEvents.map((event, idx) => borrowerAddress.toLowerCase() !== _.get(event, 'borrower')?.toLowerCase() ? undefined : {
      ...allCollaterals[idx],
      loanExpireTimestamp: _.get(event, 'loanExpireTimestamp'),
    }))
  }

  // TODO: Optimize this. Currently doing this in series to avoid 429 for some API calls.
  for (let i = 0, n = nfts.length; i < n; i++) {
    try {
      const metadata = await getNFTMetadata({ blockchain, nftId: nfts[i].id, collectionAddress: nfts[i].collection.address })
      nfts[i] = {
        ...nfts[i],
        ...metadata,
      }
    }
    catch (e) {
      nfts[i] = {
        ...nfts[i],
        imageUrl: nfts[i].collection.imageUrl,
        name: nfts[i].collection.name,
      }
    }
  }

  return nfts
}
