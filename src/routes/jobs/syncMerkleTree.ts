import BigNumber from 'bignumber.js'
import EthDater from 'ethereum-block-by-date'
import { NextFunction, Request, Response } from 'express'
import keccak from 'keccak'
import { MerkleTree } from 'merkletreejs'
import Web3 from 'web3'
import VEPINE_ABI from '../../abis/VePine.json' assert { type: 'json' }
import appConf from '../../app.conf'
import getEthWeb3 from '../../controllers/utils/getEthWeb3'
import { MerkleTreeModel } from '../../db'
import logger from '../../utils/logger'

const kk = (x: any) => keccak('keccak256').update(x).digest().toString('hex')

const getStartBlock = async (web3: Web3) => {
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

  return startBlock
}

function smallestPowerOfTwoGreaterThan(m: number) {
  let power = 0
  while (Math.pow(2, power) < m) {
    power++
  }
  return Math.pow(2, power)
}

export default async function syncMerkleTree(req: Request, res: Response, next: NextFunction) {
  try {
    const web3 = getEthWeb3('137')
    const contract = new web3.eth.Contract(
      VEPINE_ABI as any[],
      appConf.vePINEAddress
    )
    const currentBlock = await web3.eth.getBlockNumber()
    logger.info(`Merkle tree generation for ${currentBlock}...`)

    const rewards: Record<string, BigNumber> = {}

    const users: string[] = await contract.methods.getAllUsers().call()
    const startBlock = await getStartBlock(web3)
    let block = startBlock

    for (let i = 0; i <= 6; i++) {
      logger.info(`Calculating users share value on block ${block}...`)
      const totalVeSb = await contract.methods
        .totalVeSb()
        .call(undefined, block)
      for (const user of users) {
        logger.info(`Calculating user share value on block ${block} for ${user}...`)
        const userVeSb = await contract.methods
          .userVeSb(user)
          .call(undefined, block)
        const rate = new BigNumber(userVeSb).dividedBy(new BigNumber(totalVeSb))
        if (rate.gt(0)) {
          if (rewards[user]) {
            rewards[user] = rate.plus(rewards[user])
          }
          else {
            rewards[user] = rate
          }
        }
      }
      if (i < 5) {
        block += appConf.snapshotPeriod
      }
      else {
        block = currentBlock
      }
    }

    const amounts = Object.keys(rewards).map(k =>
      rewards[k].dividedBy(7).multipliedBy(41666).toFixed(10)
    )

    const addresses = Array(smallestPowerOfTwoGreaterThan(users.length))
      .fill(
        web3.eth.abi.encodeParameters(
          ['address', 'uint256'],
          ['0x0000000000000000000000000000000000000000', '0']
        )
      )
      .map((e, i) =>
        Array.from(Object.keys(rewards)).at(i)
          ? web3.eth.abi.encodeParameters(
            ['address', 'uint256'],
            [
              Array.from(Object.keys(rewards)).at(i),
              web3.utils.toWei(String(Array.from(amounts).at(i))),
            ]
          )
          : e
      )
    let leaves = addresses.map(
      e => '0x' + kk(Buffer.from(e.slice(2), 'hex'))
    ) // uts.methods.getLeaf(e).call())

    leaves = leaves.map(e => e.slice(2))

    const proofer: Record<string, any> = {
      proofs: {},
      root: '',
    }

    const tree = new MerkleTree(leaves, kk)
    const root = tree.getRoot().toString('hex')
    proofer.root = '0x' + root

    logger.info('calculating merkle tree')

    for (const leafIndex in leaves) {
      if (leaves[leafIndex]) {
        const leaf = leaves[leafIndex]
        const proof = tree.getHexProof(leaf)
        const address = web3.eth.abi.decodeParameters(
          ['address', 'uint256'],
          addresses[leafIndex]
        )
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

    logger.info(`Merkle tree generation for ${currentBlock} with reards ${sum.toString()}... OK`)
    res.status(200).send()
  }
  catch (err) {
    logger.error('Handling runtime error... ERR:', err)
    next(err)
  }
}
