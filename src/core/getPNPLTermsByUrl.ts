import { findOne as findOneCollection } from '../db/collections'
import { EthBlockchain } from '../entities/lib/Blockchain'
import EthereumNetwork from '../entities/lib/EthereumNetwork'
import PNPLTerms from '../entities/lib/PNPLTerms'
import failure from '../utils/failure'
import Web3 from 'web3'
import getOpenseaPNPLTerms from './getOpenseaPNPLTerms'

type Params = {
  parsedURL: URL
}

/**
 *
 * @param params - See {@link Params}.
 *
 * @returns pnpl terms.
 */
export default async function getPNPLTermsByUrl({ parsedURL }: Params): Promise<PNPLTerms> {
  const hostname = parsedURL.hostname

  switch (hostname) {
  case 'opensea.io': {
    const [, , collectionAddress, nftId] = parsedURL.pathname.split('/')
    if (!Web3.utils.isAddress(collectionAddress)) throw failure('INVALID_COLLECTION_ADDRESS')
    if (!collectionAddress || !nftId) throw failure('INVALID_PARAMS')

    const collection = await findOneCollection({ address: collectionAddress, blockchain: EthBlockchain(EthereumNetwork.MAIN) })
    if (!collection) throw failure('UNSUPPORTED_COLLECTION')

    return getOpenseaPNPLTerms({
      openseaVersion: 'main',
      blockchain: EthBlockchain(EthereumNetwork.MAIN),
      collectionId: collection.id,
      nftId,
    })

    break
  }
  case 'testnets.opensea.io': {
    const [, , collectionAddress, nftId] = parsedURL.pathname.split('/')
    if (!Web3.utils.isAddress(collectionAddress)) throw failure('INVALID_COLLECTION_ADDRESS')
    if (!collectionAddress || !nftId) throw failure('INVALID_PARAMS')

    const collection = await findOneCollection({ address: collectionAddress, blockchain: EthBlockchain(EthereumNetwork.RINKEBY) })
    if (!collection) throw failure('UNSUPPORTED_COLLECTION')

    return getOpenseaPNPLTerms({
      openseaVersion: 'rinkeby',
      blockchain: EthBlockchain(EthereumNetwork.RINKEBY),
      collectionId: collection.id,
      nftId,
    })

    break
  }
  default:
    throw failure('INVALID_MARKETPLACE')
  }
}
