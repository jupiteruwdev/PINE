import _ from 'lodash'
import appConf from '../../app.conf'
import { findAllPools } from '../../db'
import { ActiveLoanStats, Blockchain, Pool, Value } from '../../entities'
import { getActiveLoansForPools } from '../../subgraph/request'
import fault from '../../utils/fault'
import getRequest from '../utils/getRequest'

type Params = {
  collectionAddress: string
  blockchain: Blockchain
}

type ActiveLoan = {
  id: string
  loanExpiretimestamp: string
  borrowedWei: string
  borrower: string
}

export default async function getActiveLoanStatsByCollection({ collectionAddress, blockchain }: Params) {
  try {
    const pools = await findAllPools({ collectionAddress })

    const addresses = _.reduce(pools, (prev: string[], cur: Pool) => {
      prev.push(cur.address)
      return prev
    }, [])

    const { loans }: { loans: ActiveLoan[] } = await getActiveLoansForPools({ pools: addresses })
    const promises: Promise<any>[] = []
    const result: ActiveLoanStats[] = []

    _.map(loans, ((loan: ActiveLoan) => {
      const contractAddress = loan.id.split('/')[0]
      const tokenId = loan.id.split('/')[1]

      promises.push(new Promise((resolve, reject) => {
        const alchemyUrl = _.get(appConf.alchemyAPIUrl, blockchain.networkId)

        getRequest(`${alchemyUrl}${appConf.alchemyAPIKey}/getNFTMetadata`, {
          params: {
            contractAddress,
            tokenId,
          },
        })
          .then(resolve)
          .catch(reject)
      }))

      result.push({
        id: tokenId,
        thumbnail: '',
        amountBorrowed: Value.$ETH(loan.borrowedWei),
        expiry: loan.loanExpiretimestamp,
        poolOwner: loan.borrower,
      })
    }))

    return Promise.all(promises)
      .then(res => _.map(res, (token, index: number) => ({
        ...result[index],
        thumbnail: token.metadata.image,
      })))
  }
  catch (err) {
    throw fault('ERR_GET_ACTIVE_LOAN_STATS_BY_COLLECTION', undefined, err)
  }
}
