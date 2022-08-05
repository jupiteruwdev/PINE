import BigNumber from 'bignumber.js'
import _ from 'lodash'
import { Blockchain, Collection, Loan, NFT, Value } from '../../entities'
import { getOnChainLoansByPools } from '../../subgraph'
import fault from '../../utils/fault'
import { getEthNFTMetadata } from '../collaterals'
import { searchPublishedPools } from '../pools'

type Params = {
  blockchain: Blockchain
  collectionAddress: string
}

export default async function getLoansByCollection({
  blockchain,
  collectionAddress,
}: Params): Promise<Loan[]> {
  try {
    const pools = await searchPublishedPools({ collectionAddress, blockchainFilter: { [blockchain.network]: blockchain.networkId } })
    const poolAddresses = pools.map(t => t.address)
    const onChainLoans = await getOnChainLoansByPools({ poolAddresses }, { networkId: blockchain.networkId })

    const loans = onChainLoans.map(t => {
      const collectionAddress = t.id.split('/')[0] ?? ''
      const tokenId = t.id.split('/')[1] ?? ''

      return Loan.factory({
        accuredInterest: Value.$WEI(t.accuredInterestWei),
        borrowed: Value.$ETH(t.borrowedWei),
        borrowerAddress: t.borrower,
        expiresAt: new Date(_.toNumber(t.loanExpiretimestamp) * 1000),
        interestBPSPerBlock: new BigNumber(t.interestBPS1000000XBlock).dividedBy(1_000_000),
        loanStartBlock: t.loanStartBlock,
        maxLTVBPS: new BigNumber(t.maxLTVBPS),
        nft: NFT.factory({
          collection: Collection.factory({
            address: collectionAddress,
            blockchain,
          }),
          id: tokenId,
          isSupported: true,
        }),
        poolAddress: t.pool,
        repaidInterest: Value.$WEI(t.repaidInterestWei),
        returned: Value.$WEI(t.returnedWei),
      })
    })

    const getMetadataRequests = loans.map(t => getEthNFTMetadata({
      blockchain,
      collectionAddress: t.nft.collection.address,
      nftId: t.nft.id,
    }))

    const metadata = await Promise.all(getMetadataRequests)

    return loans.map((t, i) => ({
      ...t,
      nft: {
        ...t.nft,
        ...metadata[i],
      },
    }))
  }
  catch (err) {
    throw fault('ERR_GET_LOANS_BY_COLLECTION', undefined, err)
  }
}
