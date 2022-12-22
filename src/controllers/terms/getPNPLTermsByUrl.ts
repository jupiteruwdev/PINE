import Web3 from 'web3'
import { Blockchain, PNPLTerms } from '../../entities'
import fault from '../../utils/fault'
import getLooksRarePNPLTerms from './getLooksRarePNPLTerms'
import getOpenSeaPNPLTerms from './getOpenSeaPNPLTerms'
import getX2Y2PNPLTerms from './getX2Y2PNPLTerms'

type Params = {
  parsedURLs: URL[]
  poolAddresses?: string[]
}

/**
 *
 * @param params - See {@link Params}.
 *
 * @returns pnpl terms.
 */
export default async function getPNPLTermsByUrl({ parsedURLs, poolAddresses }: Params): Promise<PNPLTerms[]> {
  const openseaHostnames = parsedURLs.filter(url => url.hostname === 'opensea.io')
  const openseaTestHostnames = parsedURLs.filter(url => url.hostname === 'testnets.opensea.io')
  const looksrareHostnames = parsedURLs.filter(url => url.hostname === 'looksrare.org')
  const looksrareTestHostnames = parsedURLs.filter(url => url.hostname === 'rinkeby.looksrare.org')
  const x2y2Hotnames = parsedURLs.filter(url => url.hostname === 'x2y2.io')

  let terms: PNPLTerms[] = []

  if (openseaHostnames.length) {
    const collectionAddresses = openseaHostnames.map(parsedURL => RegExp(/0x[a-fA-F0-9]{40}/).exec(parsedURL.pathname)?.at(0)).filter(address => !!address) as string[]
    const nftIds = openseaHostnames.map(parsedURL => RegExp(/(\d+$)|(\/\d+\/)/).exec(parsedURL.pathname)?.at(0)).filter(nftId => !!nftId) as string[]
    if (collectionAddresses.length !== openseaHostnames.length || nftIds.length !== openseaHostnames.length) throw fault('ERR_PNPL_INVALID_URL')
    if (collectionAddresses.find(collectionAddress => !Web3.utils.isAddress(collectionAddress))) throw fault('ERR_PNPL_INVALID_URL')

    terms = terms.concat(await getOpenSeaPNPLTerms({
      openseaVersion: 'main',
      blockchain: Blockchain.Ethereum(Blockchain.Ethereum.Network.MAIN),
      collectionAddresses,
      nftIds,
      poolAddresses,
    }),
    )
  }
  if (openseaTestHostnames.length) {
    const collectionAddresses = openseaHostnames.map(parsedURL => RegExp(/0x[a-fA-F0-9]{40}/).exec(parsedURL.pathname)?.at(0)).filter(address => !!address) as string[]
    const nftIds = openseaHostnames.map(parsedURL => RegExp(/(\d+$)|(\/\d+\/)/).exec(parsedURL.pathname)?.at(0)).filter(nftId => !!nftId) as string[]
    if (collectionAddresses.length !== openseaHostnames.length || nftIds.length !== openseaHostnames.length) throw fault('ERR_PNPL_INVALID_URL')
    if (collectionAddresses.find(collectionAddress => !Web3.utils.isAddress(collectionAddress))) throw fault('ERR_PNPL_INVALID_URL')

    terms = terms.concat(await getOpenSeaPNPLTerms({
      openseaVersion: 'rinkeby',
      blockchain: Blockchain.Ethereum(Blockchain.Ethereum.Network.RINKEBY),
      collectionAddresses,
      nftIds,
      poolAddresses,
    }))
  }
  if (looksrareHostnames.length) {
    // https://looksrare.org/collections/0x306b1ea3ecdf94aB739F1910bbda052Ed4A9f949/3060
    const [collectionAddresses, nftIds]: [string[], string[]] = parsedURLs.reduce((pre: [string[], string[]], cur) => {
      const [, , collectionAddress, nftId] = cur.pathname.split('/')
      return [
        [...pre[0], collectionAddress],
        [...pre[1], nftId],
      ]
    }, [[], []])
    // const [, , collectionAddress, nftId] = parsedURL.pathname.split('/')
    if (collectionAddresses.find(collectionAddress => !Web3.utils.isAddress(collectionAddress))) throw fault('ERR_PNPL_INVALID_URL')
    if (collectionAddresses.length !== nftIds.length || nftIds.length !== looksrareHostnames.length) throw fault('ERR_PNPL_INVALID_URL')

    terms = terms.concat(await getLooksRarePNPLTerms({
      blockchain: Blockchain.Ethereum(Blockchain.Ethereum.Network.MAIN),
      collectionAddresses,
      nftIds,
      poolAddresses,
    }))
  }
  if (looksrareTestHostnames.length) {
    // https://looksrare.org/collections/0x306b1ea3ecdf94aB739F1910bbda052Ed4A9f949/3060
    const [collectionAddresses, nftIds]: [string[], string[]] = parsedURLs.reduce((pre: [string[], string[]], cur) => {
      const [, , collectionAddress, nftId] = cur.pathname.split('/')
      return [
        [...pre[0], collectionAddress],
        [...pre[1], nftId],
      ]
    }, [[], []])
    // const [, , collectionAddress, nftId] = parsedURL.pathname.split('/')
    if (collectionAddresses.find(collectionAddress => !Web3.utils.isAddress(collectionAddress))) throw fault('ERR_PNPL_INVALID_URL')
    if (collectionAddresses.length !== nftIds.length || nftIds.length !== looksrareHostnames.length) throw fault('ERR_PNPL_INVALID_URL')

    terms = terms.concat(await getLooksRarePNPLTerms({
      blockchain: Blockchain.Ethereum(Blockchain.Ethereum.Network.RINKEBY),
      collectionAddresses,
      nftIds,
      poolAddresses,
    }))
  }
  if (x2y2Hotnames.length) {
    // https://x2y2.io/eth/0x23581767a106ae21c074b2276D25e5C3e136a68b/7396
    const [collectionAddresses, nftIds]: [string[], string[]] = parsedURLs.reduce((pre: [string[], string[]], cur) => {
      const [, , collectionAddress, nftId] = cur.pathname.split('/')
      return [
        [...pre[0], collectionAddress],
        [...pre[1], nftId],
      ]
    }, [[], []])
    if (collectionAddresses.find(collectionAddress => !Web3.utils.isAddress(collectionAddress))) throw fault('ERR_PNPL_INVALID_URL')
    if (collectionAddresses.length !== nftIds.length || nftIds.length !== x2y2Hotnames.length) throw fault('ERR_PNPL_INVALID_URL')

    terms = terms.concat(await getX2Y2PNPLTerms({
      blockchain: Blockchain.Ethereum(Blockchain.Ethereum.Network.MAIN),
      collectionAddresses,
      nftIds,
      poolAddresses,
    }))
  }

  if (!terms.length) {
    throw fault('ERR_PNPL_UNSUPPORTED_MARKETPLACE')
  }

  return terms
}
