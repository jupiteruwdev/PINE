import _ from 'lodash'

export default function normalizeIPFSUri(uri: string) {
  if (_.startsWith(uri, 'ipfs://')) return `https://ipfs.io/ipfs/${uri.substring(7)}`

  return uri

  // if (uri.slice(0, 4) !== 'ipfs') {
  //   return uri.replace(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\/ipfs\//, 'https://tempus.mypinata.cloud/ipfs/')
  // }

  // if (uri.indexOf('ipfs://ipfs/') !== -1) {
  //   return uri.replace('ipfs://ipfs/', 'https://tempus.mypinata.cloud/ipfs/')
  // }

  // return uri.replace('ipfs://', 'https://tempus.mypinata.cloud/ipfs/')
}
