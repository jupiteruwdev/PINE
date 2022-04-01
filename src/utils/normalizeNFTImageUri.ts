export default function normalizeNFTImageUri(uri: string) {
  if (uri.slice(0, 4) !== 'ipfs') return uri
  if (uri.indexOf('ipfs://ipfs/') !== -1) return uri.replace('ipfs://ipfs/', 'https://tempus.mypinata.cloud/ipfs/')
  return uri.replace('ipfs://', 'https://tempus.mypinata.cloud/ipfs/')
}
