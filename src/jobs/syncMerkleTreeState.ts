import { ethers } from 'ethers'
import MerkleABI from '../abis/Merkle.json' assert { type: 'json' }
import appConf from '../app.conf'
import getEthWeb3 from '../controllers/utils/getEthWeb3'
import { MerkleTreeModel, initDb } from '../database'
import fault from '../utils/fault'
import logger from '../utils/logger'

export default async function syncMerkleTreeState() {
  try {
    await initDb({
      onError: err => {
        logger.error('Establishing database conection... ERR:', err)
        throw fault('ERR_DB_CONNECTION', undefined, err)
      },
      onOpen: () => {
        logger.info('Establishing database connection... OK')
      },
    })
    const web3 = getEthWeb3('137')
    const contract = new web3.eth.Contract(
      MerkleABI as any[],
      appConf.merkleAddress
    )
    const merkles = await MerkleTreeModel.find({ claimed: false })
    const merkleIds = []

    for (const merkle of merkles) {
      try {
        logger.info(`SYNC_MERKLE_TREE_STATE: Checking claimable for address ${merkle.address} and root ${merkle.root}...`)
        const param =
          ethers.utils.solidityKeccak256([
            'bytes32', 'bytes32', 'uint256',
          ], [
            merkle.root,
            `0x${merkle.leaf}`,
            merkle.index,
          ])
        const claimable = await contract.methods.root_leaf_index_hash_claimed(param).call()
        if (claimable) {
          merkleIds.push(merkle._id)
        }
        logger.info(`SYNC_MERKLE_TREE_STATE: Checking claimable for address ${merkle.address} and root ${merkle.root}... OK`)
      }
      catch (err) {
        logger.error(`SYNC_MERKLE_TREE_STATE: Checking claimable for address ${merkle.address} and root ${merkle.root}... ERR`, err)
      }
    }

    await MerkleTreeModel.updateMany({
      _id: {
        $in: merkleIds,
      },
    }, {
      $set: {
        claimed: true,
      },
    })

    logger.info(`SYNC_MERKLE_TREE_STATE: Update ${merkleIds.length} merkle tree state`)
  }
  catch (err) {
    logger.error('SYNC_MERKLE_TREE_STATE: Handling runtime error... ERR:', err)
    process.exit(1)
  }
}

syncMerkleTreeState()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1) // Retry Job Task by exiting the process
  })
