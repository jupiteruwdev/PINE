import BigNumber from 'bignumber.js'
import { assert } from 'console'
import { ethers } from 'ethers'
import { NextFunction, Request, Response } from 'express'
import _ from 'lodash'
import PoolHelperABI from '../abis/PoolHelper.json' assert { type: 'json' }
import appConf from '../app.conf'
import { getPoolCapacity, getPoolUtilization } from '../controllers'
import getPoolEthLimit from '../controllers/contracts/getPoolEthLimit'
import getEthWeb3 from '../controllers/utils/getEthWeb3'
import { PoolModel } from '../db'
import { Blockchain, CodingResolver, serializeEntityArray, useBigNumberCoder, useNumberCoder } from '../entities'
import logger from '../utils/logger'

function areLoanOptionsEqual(a: any[], b: any[]): boolean {
  const codingResolver: CodingResolver<any> = {
    loanDurationBlock: useNumberCoder(),
    loanDurationSecond: useNumberCoder(),
    interestBpsBlock: useBigNumberCoder(),
    maxLtvBps: useNumberCoder(),
  }

  return _.isEqual(
    serializeEntityArray(a.sort(t => t.loanDurationSecond), codingResolver),
    serializeEntityArray(b.sort(t => t.loanDurationSecond), codingResolver),
  )
}

async function getPublishedPools({ networkId, poolVersion, includeRetired }: {
  networkId: string
  poolVersion?: number
  includeRetired?: boolean
}) {
  const condition: Record<string, any> = {
    networkId,
  }

  if (poolVersion) condition['poolVersion'] = { $gt: poolVersion }
  if (!includeRetired) condition['retired'] = { $ne: true }

  const pools = await PoolModel.find(condition).lean()

  return pools
}

async function retireInvalidPools(networkId: string) {
  const pools = await getPublishedPools({
    networkId,
    poolVersion: 2,
  })
  const addresses = pools.map(t => t.address)
  const web3 = getEthWeb3(networkId)
  const contract = new web3.eth.Contract(PoolHelperABI as any, _.get(appConf.poolHelperAddress, networkId))
  const validityTable = await contract.methods.checkPoolValidity(addresses).call()

  assert(validityTable.length === pools.length, 'JOB_SYNC_POOLS Number of results from <checkPoolValidity> is different from provided array of addresses')

  logger.info(`JOB_SYNC_POOLS Checking validity of ${pools.length} published pool(s)...`)

  const retirees = addresses.filter((v, i) => validityTable[i] !== true)
  const numRetirees = retirees.length

  if (numRetirees <= 0) return logger.info(`JOB_SYNC_POOLS Checking validity of ${pools.length} published pool(s)... OK: No pools to retire`)

  const { modifiedCount } = await PoolModel.updateMany({
    address: new RegExp(retirees.join('|'), 'i'),
  }, {
    retired: true,
  })

  if (modifiedCount !== numRetirees) {
    logger.warn(`JOB_SYNC_POOLS Checking validity of ${pools.length} published pool(s) to retire... WARN: Expected to retire ${numRetirees} pool(s), retired ${modifiedCount} instead`)
  }
  else {
    logger.info(`JOB_SYNC_POOLS Checking validity of ${pools.length} published pool(s) to retire... OK: Retired ${numRetirees} pools [${retirees}]`)
  }
}

async function patchLoanOptions(networkId: string) {
  const pools = await getPublishedPools({
    networkId,
    poolVersion: 2,
  })
  const numPools = pools.length
  const web3 = getEthWeb3(networkId)
  const contract = new web3.eth.Contract(PoolHelperABI as any, _.get(appConf.poolHelperAddress, networkId))
  const res = await contract.methods.checkLoanOptions(pools.map(t => t.address)).call()

  assert(_.isArray(res), 'JOB_SYNC_POOLS Expected results from <checkLoanOptions> to be an array')

  logger.info(`JOB_SYNC_POOLS Patching loan options of ${numPools} published pool(s)...`)

  const newLoanOptionsDict = res.reduce((prev: any, curr: any) => {
    const { poolAddress, durationSeconds, interestBPS1000000XBlock, collateralFactorBPS } = curr
    const _address = poolAddress.toLowerCase()
    const loanDurationSecond = Number(durationSeconds)
    const loanDurationBlock = loanDurationSecond / appConf.ethBlocksPerSecond
    const interestBpsBlock = new BigNumber(interestBPS1000000XBlock).div(1_000_000)
    const maxLtvBps = Number(collateralFactorBPS)

    return {
      ...prev,
      [_address]: [...prev[_address] ?? [], {
        loanDurationSecond,
        loanDurationBlock,
        maxLtvBps,
        interestBpsBlock,
      }],
    }
  }, {})

  let count = 0

  for (const pool of pools) {
    const address = pool.address
    if (!address) continue

    const oldOptions = pool.loanOptions
    const newOptions = newLoanOptionsDict[address.toLowerCase()]

    if (newOptions && areLoanOptionsEqual(oldOptions, newOptions)) {
      logger.info(`JOB_SYNC_POOLS Patching pool <${address}>... SKIP: No changes`)
      continue
    }
    else {
      const { acknowledged } = await PoolModel.updateOne({ address }, { $set: { loanOptions: newOptions } })

      if (acknowledged === true) {
        logger.info(`JOB_SYNC_POOLS Patching pool <${address}>... OK: ${JSON.stringify(newOptions)}`)
        count++
      }
      else {
        logger.warn(`JOB_SYNC_POOLS Patching pool <${address}>... WARN: Unable to patch`)
      }
    }
  }

  logger.info(`JOB_SYNC_POOLS Patching ${numPools} published pool(s)... OK: Patched ${count} pool(s) in total`)
}

async function updatePoolEthLimmits(networkId: string) {
  const pools = await getPublishedPools({
    networkId,
    includeRetired: true,
  })
  let count = 0
  logger.info(`JOB_SYNC_POOLS updating pool ethLimit of ${pools.length} pool(s)...`)

  await Promise.all(pools.map(async pool => {
    const amount = await getPoolEthLimit({ blockchain: Blockchain.factory({
      network: pool.networkType,
      networkId: pool.networkId,
    }), poolAddress: pool.address ?? '' })

    if (amount && ethers.utils.parseEther(pool.ethLimit?.toString() ?? '0') !== amount) {
      count++
      await PoolModel.updateOne({ address: pool.address }, {
        $set: { ethLimit: ethers.utils.formatEther(amount) },
      })
    }
    else {
      logger.info(`JOB_SYNC_POOLS updating pool ethLimit <${pool.address}> ... SKIP: No Changes`)
    }
  }))

  logger.info(`JOB_SYNC_POOLS Updating pool ethLimit for ${pools.length} pool(s)... OK: updated ${count} pool(s) in total`)
}

async function updatePoolValueLocked(networkId: string) {
  const pools = await getPublishedPools({
    networkId,
    includeRetired: true,
  })
  let count = 0
  logger.info(`JOB_SYNC_POOLS updating pool value locked of ${pools.length} pool(s)...`)

  await Promise.all(pools.map(async pool => {
    const [{ amount: utilizationEth }, { amount: capacityEth }] =
      await Promise.all([
        getPoolUtilization({
          blockchain: Blockchain.factory({
            network: pool.networkType,
            networkId: pool.networkId,
          }),
          poolAddress: pool.address ?? '',
        }),
        getPoolCapacity({
          blockchain: Blockchain.factory({
            network: pool.networkType,
            networkId: pool.networkId,
          }),
          poolAddress: pool.address ?? '',
          fundSource: pool.fundSource,
          tokenAddress: pool.tokenAddress,
        }),
      ])
    const ethLimit = new BigNumber(pool.ethLimit?.toString() || '0')

    const valueLockedEth = capacityEth.plus(utilizationEth).gt(new BigNumber(ethLimit.toNumber() || Number.POSITIVE_INFINITY)) ? ethLimit : capacityEth.plus(utilizationEth)
    if (valueLockedEth.toString() !== pool.valueLockedEth?.toString() || utilizationEth.toString() !== pool.utilizationEth?.toString()) {
      logger.info(`JOB_SYNC_POOLS updating pool value locked <${pool.address}> ...`)
      count++
      await PoolModel.updateOne({ address: pool.address }, {
        $set: { valueLockedEth: valueLockedEth.toNumber(), utilizationEth: utilizationEth.toNumber() },
      })
    }
    else {
      logger.info(`JOB_SYNC_POOLS updating pool value locked <${pool.address}> ... SKIP: No Changes`)
    }
  }))

  logger.info(`JOB_SYNC_POOLS Updating pool value locked for ${pools.length} pool(s)... OK: updated ${count} pool(s) in total`)
}

export default async function syncPools(req: Request, res: Response, next: NextFunction) {
  try {
    await retireInvalidPools(Blockchain.Ethereum.Network.MAIN)
    await patchLoanOptions(Blockchain.Ethereum.Network.MAIN)
    await updatePoolEthLimmits(Blockchain.Ethereum.Network.MAIN)
    await updatePoolValueLocked(Blockchain.Ethereum.Network.MAIN)

    await retireInvalidPools(Blockchain.Polygon.Network.MAIN)
    await patchLoanOptions(Blockchain.Polygon.Network.MAIN)
    await updatePoolEthLimmits(Blockchain.Polygon.Network.MAIN)
    await updatePoolValueLocked(Blockchain.Polygon.Network.MAIN)

    res.status(200).send()
  }
  catch (err) {
    logger.error('JOB_SYNC_POOLS Handling runtime error... ERR:', err)
    next(err)
  }
}
