import Web3 from 'web3'
import { Blockchain, PNPLTerms } from '../../entities'
import fault from '../../utils/fault'
import getLooksRarePNPLTerms from './getLooksRarePNPLTerms'
import getOpenSeaPNPLTerms from './getOpenSeaPNPLTerms'

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
    const [, , , collectionAddress, nftId] = parsedURL.pathname.split('/')
    if (!Web3.utils.isAddress(collectionAddress)) throw fault('ERR_PNPL_INVALID_URL')
    if (!collectionAddress || !nftId) throw fault('ERR_PNPL_INVALID_URL')

    return getOpenSeaPNPLTerms({
      openseaVersion: 'main',
      blockchain: Blockchain.Ethereum(Blockchain.Ethereum.Network.MAIN),
      collectionAddress,
      nftId,
    })
  }
  case 'testnets.opensea.io': {
    const [, , , collectionAddress, nftId] = parsedURL.pathname.split('/')
    if (!Web3.utils.isAddress(collectionAddress)) throw fault('ERR_PNPL_INVALID_URL')
    if (!collectionAddress || !nftId) throw fault('ERR_PNPL_INVALID_URL')

    return getOpenSeaPNPLTerms({
      openseaVersion: 'rinkeby',
      blockchain: Blockchain.Ethereum(Blockchain.Ethereum.Network.RINKEBY),
      collectionAddress,
      nftId,
    })
  }
  case 'looksrare.org': {
    // https://looksrare.org/collections/0x306b1ea3ecdf94aB739F1910bbda052Ed4A9f949/3060
    const [, , collectionAddress, nftId] = parsedURL.pathname.split('/')
    if (!Web3.utils.isAddress(collectionAddress)) throw fault('ERR_PNPL_INVALID_URL')
    if (!collectionAddress || !nftId) throw fault('ERR_PNPL_INVALID_URL')

    return getLooksRarePNPLTerms({
      blockchain: Blockchain.Ethereum(Blockchain.Ethereum.Network.MAIN),
      collectionAddress,
      nftId,
    })
  }
  case 'rinkeby.looksrare.org': {
    // https://looksrare.org/collections/0x306b1ea3ecdf94aB739F1910bbda052Ed4A9f949/3060
    const [, , collectionAddress, nftId] = parsedURL.pathname.split('/')
    if (!Web3.utils.isAddress(collectionAddress)) throw fault('ERR_PNPL_INVALID_URL')
    if (!collectionAddress || !nftId) throw fault('ERR_PNPL_INVALID_URL')

    return getLooksRarePNPLTerms({
      blockchain: Blockchain.Ethereum(Blockchain.Ethereum.Network.RINKEBY),
      collectionAddress,
      nftId,
    })
  }
  default:
    throw fault('ERR_PNPL_UNSUPPORTED_MARKETPLACE')
  }
}