import { Blockchain } from '../../entities'
import logger from '../../utils/logger'

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

    case 'solana':
    }
  }
  catch (err) {
    logger.error(`Searching loans for collection addresses <${collectionAddresses?.join(',')}>, lender addresses<${lenderAddresses?.join(',')}>, collection names <${collectionNames?.join(',')} and blockchain <${JSON.stringify(blockchain)}>... ERR:`, err)
    throw err
  }
}
