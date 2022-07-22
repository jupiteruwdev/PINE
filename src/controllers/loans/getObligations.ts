import { Blockchain, CollateralizedNFT } from '../../entities'
import { getOnChainLoanByBorrower } from '../../subgraph'
import { getNFTMetadata } from '../collaterals'
import { getCollection } from '../collections'

type Params = {
  blockchain: Blockchain
  borrowerAddress: string
}

export default async function getObligations({ blockchain, borrowerAddress }: Params) {
  let nfts: CollateralizedNFT[]
  const { loans } = await getOnChainLoanByBorrower({ borrowerAddress }, { networkId: blockchain.networkId })

  nfts = await Promise.all(loans.map(async (loan: any) => ({
    collection: await getCollection({
      address: loan.erc721,
      blockchain,
      nftId: loan.id.split('/')[1],
    }),
    id: loan.id.split('/')[1],
    loanExpireTimestamp: loan.loanExpiretimestamp,
  })))

  // // TODO: Optimize this. Currently doing this in series to avoid 429 for some API calls.
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
