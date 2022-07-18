import BigNumber from 'bignumber.js'
import _ from 'lodash'
import appConf from '../../app.conf'
import { findAllPools } from '../../db'
import { Blockchain, Pool, Value } from '../../entities'
import Loan from '../../entities/lib/Loan'
import { getActiveLoansForPools } from '../../subgraph/request'
import fault from '../../utils/fault'
import getRequest from '../utils/getRequest'

type Params = {
  collectionAddress: string
  blockchain: Blockchain
}

export default async function getLoans({ collectionAddress, blockchain }: Params) {
  try {
    const pools = await findAllPools({ collectionAddress })

    const addresses = _.reduce(pools, (prev: string[], cur: Pool) => {
      prev.push(cur.address)
      return prev
    }, [])

    const { loans } = await getActiveLoansForPools({ pools: addresses })
    const promises: Promise<any>[] = []
    const result: Loan[] = []

    _.map(loans, (loan => {
      const contractAddress = loan.id.split('/')[0] ?? ''
      const tokenId = loan.id.split('/')[1] ?? ''

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
        borrowed: Value.$ETH(loan.borrowedWei),
        accuredInterest: Value.$WEI(loan.accuredInterestWei),
        expiresAt: new Date(_.toNumber(loan.loanExpiretimestamp) * 1000),
        borrowerAddress: loan.borrower,
        interestBPSPerBlock: new BigNumber(loan.interestBPS1000000XBlock).dividedBy(new BigNumber(1_000_000)),
        loanStartBlock: loan.loanStartBlock,
        maxLTVBPS: new BigNumber(loan.maxLTVBPS),
        poolAddress: loan.pool,
        repaidInterest: Value.$WEI(loan.repaidInterestWei),
        returned: Value.$WEI(loan.returnedWei),
        nft: {
          collection: {
            address: contractAddress,
            blockchain,
          },
          id: tokenId,
          imageUrl: '',
          name: '',
          isSupported: true,
        },
      })
    }))

    return Promise.all(promises)
      .then(res => _.map(res, (token, index: number) => ({
        ...result[index],
        nft: {
          ...result[index].nft,
          imageUrl: token.metadata.image as string,
          name: token.metadata.name as string,
        },
      })))
  }
  catch (err) {
    throw fault('ERR_GET_ACTIVE_LOAN_STATS_BY_COLLECTION', undefined, err)
  }
}
