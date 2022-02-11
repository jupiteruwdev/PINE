import _ from 'lodash'
import { supportedCollections } from '../config/supportedCollecitons'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import getCollateralLoanPosition from './getCollateralLoanPosition'
import getNFTById from './getNFTById'
import getNFTsByOwner from './getNFTsByOwner'

type Params = {
  borrowerAddress: string
}

export default async function getObligations({ borrowerAddress }: Params, blockchain: Blockchain = EthBlockchain()) {
  const poolAddresses = _.map(supportedCollections, data => data.lendingPool.address)
  const allCollaterals = _.flatten(await Promise.all(poolAddresses.map(poolAddress => getNFTsByOwner({ ownerAddress: poolAddress, populateMetadata: false }, blockchain))))
  const allLoanPositions = await Promise.all(allCollaterals.map(collateral => getCollateralLoanPosition({ nftId: collateral.id, poolAddress: collateral.ownerAddress }, blockchain)))
  const obligations = _.compact(allLoanPositions.map((position, idx) => borrowerAddress.toLowerCase() !== _.get(position, 'borrower')?.toLowerCase() ? undefined : allCollaterals[idx]))
  const obligationsWithMetadata = await Promise.all(obligations.map(obligation => getNFTById({ id: obligation.id, collectionAddress: obligation.collection.address, ownerAddress: obligation.ownerAddress, populateMetadata: true }, blockchain)))

  return obligationsWithMetadata
}
