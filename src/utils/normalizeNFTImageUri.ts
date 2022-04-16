export default function normalizeNFTImageUri(uri: string) {
  if (uri.slice(0, 4) !== 'ipfs') {
    return uri.replace(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\/ipfs\//, 'https://tempus.mypinata.cloud/ipfs/')
  }
  if (uri.indexOf('ipfs://ipfs/') !== -1) return uri.replace('ipfs://ipfs/', 'https://tempus.mypinata.cloud/ipfs/')
  return uri.replace('ipfs://', 'https://tempus.mypinata.cloud/ipfs/')
}
