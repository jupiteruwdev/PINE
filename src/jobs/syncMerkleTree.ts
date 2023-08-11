import BigNumber from 'bignumber.js'
import EthDater from 'ethereum-block-by-date'
import keccak from 'keccak'
import { MerkleTree } from 'merkletreejs'
import Web3 from 'web3'
import VEPINE_ABI from '../abis/VePine.json' assert { type: 'json' }
import appConf from '../app.conf'
import getEthWeb3 from '../controllers/utils/getEthWeb3'
import { MerkleTreeModel, initDb } from '../database'
import { Blockchain, Value } from '../entities'
import fault from '../utils/fault'
import logger from '../utils/logger'
import getTokenUSDPrice, { AvailableToken } from '../controllers/utils/getTokenUSDPrice'

const kk = (x: any) => keccak('keccak256').update(x).digest().toString('hex')

// const blockedCollections = ['0x04c003461abc646a5c22353edf8e8edc16837492', '0x5a7869db28eb513945167293638d59a336a89190', '0x87e738a3d5e5345d6212d8982205a564289e6324', '0xdb0373feaa9e2af8515fd2827ef7c4243bdcba07', '0xde494e809e28e70d5e2a26fb402e263030089214']

const getStartBlockAndDate = async (web3: Web3) => {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const prevSaturday = new Date(today)

  prevSaturday.setDate(today.getDate() - dayOfWeek - 1) // Saturday: epoch calculation start
  prevSaturday.setUTCHours(8)
  prevSaturday.setUTCMinutes(0)
  prevSaturday.setUTCSeconds(0)
  prevSaturday.setUTCMilliseconds(0)

  const dater = new EthDater(web3)
  const { block: startBlock } = await dater.getDate(prevSaturday)
  prevSaturday.setDate(prevSaturday.getDate() - 1)

  return {
    startBlock,
    startDate: prevSaturday,
  }
}

function smallestPowerOfTwoGreaterThan(m: number) {
  let power = 0
  while (Math.pow(2, power) < m) {
    power++
  }
  return Math.pow(2, power)
}

const tokenUSDPrice: Record<string, Value | null> = {
  [Blockchain.Ethereum.Network.MAIN]: null,
  [Blockchain.Polygon.Network.MAIN]: null,
}

export default async function syncMerkleTree() {
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
    const web3 = getEthWeb3(Blockchain.Polygon.Network.MAIN)
    const { startBlock } = await getStartBlockAndDate(web3)
    const ethPrice = await getTokenUSDPrice(AvailableToken.ETH)
    const maticPrice = await getTokenUSDPrice(AvailableToken.MATIC)

    tokenUSDPrice[Blockchain.Ethereum.Network.MAIN] = Value.factory({
      amount: ethPrice?.amount,
      currency: ethPrice.currency,
    })
    tokenUSDPrice[Blockchain.Polygon.Network.MAIN] = Value.factory({
      amount: maticPrice?.amount,
      currency: maticPrice?.currency,
    })

    // const allBorrowingSnapshots = await BorrowSnapshotModel.find({
    //   createdAt: {
    //     $gt: startDate,
    //   },
    //   collectionAddress: {
    //     $not: {
    //       $in: blockedCollections,
    //     },
    //   },
    // })
    // const allLendingSnapshots = await LendingSnapshotModel.find({
    //   createdAt: {
    //     $gt: startDate,
    //   },
    //   collectionAddress: {
    //     $not: {
    //       $in: blockedCollections,
    //     },
    //   },
    // })

    // const allIncentiveUsers: string[] = _.uniq([
    //   ...allBorrowingSnapshots.map(
    //     snapshot => snapshot.borrowerAddress?.toLowerCase() ?? ''
    //   ),
    //   ...allLendingSnapshots.map(
    //     snapshot => snapshot.lenderAddress?.toLowerCase() ?? ''
    //   ),
    // ])

    const now = new Date()
    now.setHours(now.getHours() - 1)
    const rewards: Record<string, BigNumber> = {}

    const contract = new web3.eth.Contract(VEPINE_ABI as any[], appConf.vePINEAddress)
    const currentBlock = await web3.eth.getBlockNumber()
    logger.info(`JOB_SYNC_MERKLE_TREE Merkle tree generation for ${currentBlock}...`)

    const users: string[] = await contract.methods.getAllUsers().call()
    const stakedUsers = users.map(user => user.toLowerCase())

    // const totalUsers = [...allIncentiveUsers, ...stakedUsers]
    const totalUsers = [...stakedUsers]
    let block = startBlock

    let stakingSum = new BigNumber(0)

    for (let i = 0; i <= 6; i++) {
      logger.info(`JOB_SYNC_MERKLE_TREE Calculating users share value on block ${block}...`)
      const totalVeSb = await contract.methods.totalVeSb().call(undefined, block)
      for (const user of stakedUsers) {
        logger.info(`JOB_SYNC_MERKLE_TREE Calculating user share value on block ${block} for ${user}...`)
        const userVeSb = await contract.methods.userVeSb(user).call(undefined, block)
        const rate = new BigNumber(userVeSb).dividedBy(new BigNumber(totalVeSb))
        if (rate.gt(0)) {
          if (rewards[user]) {
            rewards[user] = rate.times(41666).div(7).plus(rewards[user])
          }
          else {
            rewards[user] = rate.times(41666).div(7)
          }
          stakingSum = stakingSum.plus(rate.times(41666).div(7))
        }
      }
      block += appConf.snapshotPeriod
      if (block > currentBlock) {
        block = currentBlock
      }
    }

    logger.info(`JOB_SYNC_MERKLE_TREE Total staking rewards: ${stakingSum.toString()}`)

    // let totalIncentiveRewards = new BigNumber(0)

    // const snapshotStateDate = new Date(startDate)
    // while (1) {
    //   if (
    //     snapshotStateDate.getTime() > now.getTime()
    //   ) { break }
    //   let usagePerSnapshot = new BigNumber(0)
    //   const currentSnapshotTime = snapshotStateDate.getTime()
    //   snapshotStateDate.setUTCHours(snapshotStateDate.getUTCHours() + 1)

    //   for (const incentiveUser of allIncentiveUsers) {
    //     const currentBorrowingSnapshots = allBorrowingSnapshots.filter(
    //       snapshot =>
    //         new Date(_.get(snapshot, 'createdAt')).getTime() >
    //           currentSnapshotTime &&
    //         new Date(_.get(snapshot, 'createdAt')).getTime() <
    //           snapshotStateDate.getTime()
    //     )
    //     const currentLendingSnapshots = allLendingSnapshots.filter(
    //       snapshot =>
    //         new Date(_.get(snapshot, 'createdAt')).getTime() >
    //           currentSnapshotTime &&
    //         new Date(_.get(snapshot, 'createdAt')).getTime() <
    //           snapshotStateDate.getTime()
    //     )

    //     const { usagePercent, totalPercent } = await getUsageValues({
    //       address: incentiveUser,
    //       lendingSnapshots: currentLendingSnapshots,
    //       borrowingSnapshots: currentBorrowingSnapshots,
    //       tokenPrices: tokenUSDPrice,
    //     })

    //     const protocolIncentivePerHour = appConf.incentiveRewards / 12 / 24 / 7
    //     usagePerSnapshot = usagePerSnapshot.plus(usagePercent)
    //     if (totalPercent.gt(0)) {
    //       if (rewards[incentiveUser]) {
    //         rewards[incentiveUser] = usagePercent
    //           .times(protocolIncentivePerHour)
    //           .div(totalPercent)
    //           .plus(rewards[incentiveUser])
    //       }
    //       else {
    //         rewards[incentiveUser] = usagePercent
    //           .times(protocolIncentivePerHour)
    //           .div(totalPercent)
    //       }
    //       totalIncentiveRewards = totalIncentiveRewards.plus(
    //         usagePercent.times(protocolIncentivePerHour).div(totalPercent)
    //       )
    //     }
    //   }

    //   logger.info(
    //     `JOB_SYNC_MERKLE_TREE Calculation usage sum for snapshot ${snapshotStateDate}: ${usagePerSnapshot.toString()}`
    //   )
    // }

    // logger.info(`JOB_SYNC_MERKLE_TREE Total incentive rewards: ${totalIncentiveRewards.toString()}`)

    const addresses = Array(smallestPowerOfTwoGreaterThan(totalUsers.length))
      .fill(web3.eth.abi.encodeParameters(['address', 'uint256'], ['0x0000000000000000000000000000000000000000', '0']))
      .map((e, i) => {
        const curUser: string = totalUsers[i]
        if (rewards[curUser]) {
          return web3.eth.abi.encodeParameters(['address', 'uint256'], [curUser, web3.utils.toWei(rewards[curUser].toFixed(10))])
        }
        return e
      })

    let leaves = addresses.map(e => '0x' + kk(Buffer.from(e.slice(2), 'hex'))) // uts.methods.getLeaf(e).call())

    leaves = leaves.map(e => e.slice(2))

    const proofer: Record<string, any> = {
      proofs: {},
      root: '',
    }

    const tree = new MerkleTree(leaves, kk)
    const root = tree.getRoot().toString('hex')
    proofer.root = '0x' + root

    logger.info('JOB_SYNC_MERKLE_TREE calculating merkle tree')

    for (const leafIndex in leaves) {
      if (leaves[leafIndex]) {
        const leaf = leaves[leafIndex]
        const proof = tree.getHexProof(leaf)
        const address = web3.eth.abi.decodeParameters(['address', 'uint256'], addresses[leafIndex])
        proofer.proofs[address[0].toLowerCase()] = {
          index: parseInt(leafIndex, 10),
          proof,
          leaf,
          amount: address[1],
        }
      }
    }

    let sum = new BigNumber(0)
    for (const proof of Object.values(proofer.proofs)) {
      const amount = (proof as any).amount
      sum = sum.plus(amount)
    }

    await MerkleTreeModel.insertMany(
      Object.keys(proofer.proofs)
        .filter(proof => proof !== '0x0000000000000000000000000000000000000000')
        .map(key => ({
          blockNumber: currentBlock,
          root: proofer.root,
          address: key,
          claimed: false,
          ...proofer.proofs[key],
        }))
    )

    logger.info(`JOB_SYNC_MERKLE_TREE Merkle tree generation for ${currentBlock} with reards ${sum.toString()}... OK`)
  }
  catch (err) {
    logger.error('JOB_SYNC_MERKLE_TREE Handling runtime error... ERR:', err)
    process.exit(1)
  }
}

syncMerkleTree()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1) // Retry Job Task by exiting the process
  })
