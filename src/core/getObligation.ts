import { findAll as findAllPools } from '../db/pools'
import _ from 'lodash'
import Pool from '../entities/lib/Pool'
import appConf from '../app.conf'
import { getActiveLoansForPools } from '../subgraph/request'
import ActiveLoanStat from '../entities/lib/ActiveLoanStats'
import axios from 'axios'
import { $ETH } from '../entities/lib/Value'

type Params = {
  collectionAddress: string
}

type ActiveLoan = {
  id: string
  loanExpiretimestamp: string
  borrowedWei: string
  borrower: string
}

export default async function getObligation({ collectionAddress }: Params) {
  const pools = await findAllPools({ collectionAddress })

  const addresses = _.reduce(pools, (prev: string[], cur: Pool) => {
    prev.push(cur.address)
    return prev
  }, [])

  const { loans }: { loans: ActiveLoan[] } = await getActiveLoansForPools({ pools: addresses })
  const promises: Promise<any>[] = []
  const result: ActiveLoanStat[] = []

  _.map(loans, ((loan: ActiveLoan) => {
    const contractAddress = loan.id.split('/')[0]
    const tokenId = loan.id.split('/')[1]
    promises.push(new Promise((resolve, reject) => {
      axios.get(`${appConf.alchemyAPIUrl}${appConf.alchemyAPIKey}/getNFTMetadata?contractAddress=${contractAddress}&tokenId=${tokenId}`)
        .then(res => {
          resolve(res.data)
        })
        .catch(err => {
          reject(err)
        })
    }))
    result.push({
      id: loan.id,
      thumbnail: '',
      amountBorrowed: $ETH(loan.borrowedWei),
      expiry: loan.loanExpiretimestamp,
      poolOwner: loan.borrower,
    })
  }))

  return Promise.all(promises)
    .then((res: any) => _.map(res, (token, index: number) => ({
      ...result[index],
      thumbnail: token.metadata.image,
    })))
    .catch(err => {
      throw err
    })
}
