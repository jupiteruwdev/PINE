import axios from 'axios'
import { findOne as findOneCollection } from '../db/collections'
import getLoanPosition from './getLoanPosition'
import Blockchain from '../entities/lib/Blockchain'
import EthereumNetwork from '../entities/lib/EthereumNetwork'
import failure from '../utils/failure'
import logger from '../utils/logger'

type Params = {
  blockchain: Blockchain
  collectionId: string
  nftId: string
}

const APIURL = 'https://api.thegraph.com/subgraphs/name/pinedefi/open-loans'

const tokensQuery = (collectionAddress: string, nftId: string) => (
  {
    operationName: 'openLoans',
    query: `query {
      loans(where: {id: "${collectionAddress}/${nftId}"}) {
        borrowedWei
        returnedWei
        pool
      }
    }`,
    variables: {},
  }
)

export default async function getExistingLoan({ blockchain, collectionId, nftId }: Params): Promise<any> {
  logger.info(`Checking loan extendability for NFT ID <${nftId}> and collection ID <${collectionId}> on blockchain <${JSON.stringify(blockchain)}>...`)

  switch (blockchain.network) {
  case 'ethereum': {
    const collection = await findOneCollection({ id: collectionId, blockchain })
    if (!collection) throw failure('UNSUPPORTED_COLLECTION')
    if (blockchain.networkId === EthereumNetwork.RINKEBY) {
      const position = await getLoanPosition({ blockchain, collectionId, nftId, txSpeedBlocks: 0 })
      return {
        borrowedWei: position?.borrowed.amount.toString(),
        returnedWei: position?.returned.amount.toString(),
        pool: position?.poolAddress,
      }
    }
    const { data: { data: { loans } } } = await axios.post(APIURL, tokensQuery(collection.address, nftId))
    const existingLoan = loans.length > 0 ? loans[0] : undefined

    return existingLoan
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
