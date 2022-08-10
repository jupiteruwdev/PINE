import { Blockchain, Loan } from '../../entities'
import { getOnChainLoans } from '../../subgraph'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import getLoan from './getLoan'

type Params = {
  lenderAddresses?: string[]
  collectionAddresses?: string[]
  collectionNames?: string[]
  blockchain: Blockchain
}

export default async function serachLoans({
  blockchain,
  lenderAddresses,
  collectionAddresses,
  collectionNames,
}: Params): Promise<Loan[]> {
  logger.info(`Searching loans for collection addresses <${collectionAddresses?.join(',')}>, lender addresses<${lenderAddresses?.join(',')}>, collection names <${collectionNames?.join(',')} and blockchain <${JSON.stringify(blockchain)}>...`)

  try {
    switch (blockchain.network) {
    case 'ethereum':
      const loans = await getOnChainLoans({
        lenderAddresses: lenderAddresses?.map(address => address.toLowerCase()),
        collectionAddresses: collectionAddresses?.map(address => address.toLowerCase()),
      }, {
        networkId: blockchain.networkId,
      })

      const result = loans.reduce<Promise<Loan[]>>(async (cur, loan) => {
        const curR = await cur
        const nftId = loan.id.split('/')[1]
        const resultLoan = await getLoan({ blockchain, collectionAddress: loan.erc721, nftId })
        if (resultLoan !== undefined) {
          curR.push(resultLoan)
        }
        return curR
      }, new Promise(resolve => resolve([])))

      logger.info(`Searching loans for collection addresses <${collectionAddresses?.join(',')}>, lender addresses<${lenderAddresses?.join(',')}>, collection names <${collectionNames?.join(',')} and blockchain <${JSON.stringify(blockchain)}>... OK`)

      return result
    default:
      throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    }
  }
  catch (err) {
    logger.error(`Searching loans for collection addresses <${collectionAddresses?.join(',')}>, lender addresses<${lenderAddresses?.join(',')}>, collection names <${collectionNames?.join(',')} and blockchain <${JSON.stringify(blockchain)}>... ERR:`, err)
    throw err
  }
}
