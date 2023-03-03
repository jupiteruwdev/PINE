import { ethers } from 'ethers'
import MERKLE_ABI from '../../abis/Merkle.json' assert { type: 'json' }
import appConf from '../../app.conf'
import { MerkleTreeModel } from '../../db'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import getEthWeb3 from '../utils/getEthWeb3'

type Params = {
  address: string
}

export default async function updateRewardsStats({ address }: Params) {
  try {
    logger.info(`Updating rewards stats for address ${address}...`)
    const merkleTrees = await MerkleTreeModel.find({ address: address.toLowerCase(), claimed: false }).sort({ blockNumber: -1 })
    if (merkleTrees.length) {
      const web3 = getEthWeb3('137')
      const contract = new web3.eth.Contract(MERKLE_ABI as any[], appConf.merkleAddress)
      const claimed = await contract.methods.root_leaf_index_hash_claimed(ethers.utils.solidityKeccak256([
        'bytes32', 'bytes32', 'uint256',
      ], [
        merkleTrees[0].root,
        `0x${merkleTrees[0].leaf}`,
        merkleTrees[0].index,
      ])).call()

      if (claimed) {
        const res = await MerkleTreeModel.updateMany({
          address: address.toLowerCase(),
          claimed: false,
        }, {
          $set: {
            claimed: true,
          },
        })
        logger.info(`Updating rewards stats for address ${address}... OK`)

        return res
      }
    }
  }
  catch (err) {
    logger.info(`Updating rewards stats for address ${address}... ERR:`, err)
    throw fault('ERR_UPDATE_RWARDS_STATS', undefined, err)
  }
}
