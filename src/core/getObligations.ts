import _ from 'lodash'
import { findAll as findAllPools } from '../db/pools'
import Blockchain from '../entities/Blockchain'
import getCollateralLoanPosition from './getCollateralLoanPosition'
import getNFTMetadata from './getNFTMetadata'
import getNFTsByOwner from './getNFTsByOwner'

type Params = {
  blockchain: Blockchain
  borrowerAddress: string
}

export default async function getObligations({ blockchain, borrowerAddress }: Params) {
  const pools = await findAllPools({ blockchains: { [blockchain.network]: blockchain.networkId } })
  const allCollaterals = _.flatten(await Promise.all(pools.map(pool => getNFTsByOwner({ blockchain, ownerAddress: pool.address, populateMetadata: false }))))
  const allLoanPositions = await Promise.all(allCollaterals.map(collateral => getCollateralLoanPosition({ blockchain, nftId: collateral.id, poolAddress: collateral.ownerAddress })))

  const nfts = _.compact(allLoanPositions.map((loanPosition, idx) => borrowerAddress.toLowerCase() !== _.get(loanPosition, 'borrower')?.toLowerCase() ? undefined : allCollaterals[idx]))

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
