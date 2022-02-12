import _ from 'lodash'
import { findAll as findAllPools } from '../db/pools'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import getCollateralLoanPosition from './getCollateralLoanPosition'
import getNFTMetadata from './getNFTMetadata'
import getNFTsByOwner from './getNFTsByOwner'

type Params = {
  borrowerAddress: string
}

export default async function getObligations({ borrowerAddress }: Params, blockchain: Blockchain = EthBlockchain()) {
  const pools = await findAllPools({ blockchains: { [blockchain.network]: blockchain.networkId } })
  const allCollaterals = _.flatten(await Promise.all(pools.map(pool => getNFTsByOwner({ ownerAddress: pool.address, populateMetadata: false }, blockchain))))
  const allLoanPositions = await Promise.all(allCollaterals.map(collateral => getCollateralLoanPosition({ nftId: collateral.id, poolAddress: collateral.ownerAddress }, blockchain)))

  const nfts = _.compact(allLoanPositions.map((loanPosition, idx) => borrowerAddress.toLowerCase() !== _.get(loanPosition, 'borrower')?.toLowerCase() ? undefined : allCollaterals[idx]))

  // TODO: Optimize this. Currently doing this in series to avoid 429 for some API calls.
  for (let i = 0, n = nfts.length; i < n; i++) {
    const metadata = await getNFTMetadata({ id: nfts[i].id, collectionAddress: nfts[i].collection.address }, blockchain)
    nfts[i] = {
      ...nfts[i],
      ...metadata,
    }
  }

  return nfts
}
