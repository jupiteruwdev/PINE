import BigNumber from 'bignumber.js'
import { assert } from 'console'
import { ethers } from 'ethers'
import _ from 'lodash'
import PoolHelperABI from '../../abis/PoolHelper.json' assert { type: 'json' }
import appConf from '../../app.conf'
import { getPoolCapacity, getPoolUtilization } from '../../controllers'
import getPoolEthLimit from '../../controllers/contracts/getPoolEthLimit'
import getEthWeb3 from '../../controllers/utils/getEthWeb3'
import { PoolModel } from '../../database'
import { Blockchain, CodingResolver, serializeEntityArray, useBigNumberCoder, useNumberCoder } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'

function areLoanOptionsEqual(a: any[], b: any[]): boolean {
  try {
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
  catch (err) {
    throw fault('ERR_SYNC_POOLS_ARE_LOAN_OPTIONS_EQUAL', undefined, err)
  }
}

async function getPublishedPools({ networkId, poolVersion, includeRetired }: {
  networkId: string
  poolVersion?: number
  includeRetired?: boolean
}) {
  try {
    const condition: Record<string, any> = {
      networkId,
    }

    if (poolVersion) condition['poolVersion'] = { $gt: poolVersion }
    if (!includeRetired) condition['retired'] = { $ne: true }

    const pools = await PoolModel.find(condition).lean()

    return pools
  }
  catch (err) {
    throw fault('ERR_SYNC_POOLS_GET_PUBLISHED_POOLS', undefined, err)
  }
}

async function retireInvalidPools(networkId: string) {
  try {
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
  catch (err) {
    throw fault('ERR_RETIRE_INVALID_POOLS', undefined, err)
  }
}

async function patchLoanOptions(networkId: string) {
  try {
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
  catch (err) {
    throw fault('ERR_SYNC_POOLS_PATCH_LOAN_OPTIONS', undefined, err)
  }
}

async function updatePoolEthLimmits(networkId: string) {
  try {
    const pools = await getPublishedPools({
      networkId,
      includeRetired: true,
    })
    let count = 0
    logger.info(`JOB_SYNC_POOLS updating pool ethLimit of ${pools.length} pool(s)...`)

    await Promise.all(pools.map(async pool => {
      if (!pool.noMaxLoanLimit) {
        const amount = await getPoolEthLimit({ blockchain: Blockchain.factory({
          network: pool.networkType,
          networkId: pool.networkId,
        }), poolAddress: pool.address ?? '' })

        const ethLimit = new BigNumber(pool.ethLimit?.toString() || '0')

        if (amount && ethers.utils.parseEther(ethLimit.toFixed() ?? '0') !== amount) {
          count++
          await PoolModel.updateOne({ address: pool.address }, {
            $set: { ethLimit: ethers.utils.formatEther(amount) },
          })
        }
        else {
          logger.info(`JOB_SYNC_POOLS updating pool ethLimit <${pool.address}> ... SKIP: No Changes`)
        }
      }
    }))

    logger.info(`JOB_SYNC_POOLS Updating pool ethLimit for ${pools.length} pool(s)... OK: updated ${count} pool(s) in total`)
  }
  catch (err) {
    throw fault('ERR_SYNC_POOLS_UPDATE_POOL_ETH_LIMITS', undefined, err)
  }
}

async function updatePoolValueLocked(networkId: string) {
  try {
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
  catch (err) {
    throw fault('ERR_SYNC_POOLS_UPDATE_POOL_VALUE_LOCKED', undefined, err)
  }
}

export default async function syncPools() {
  try {
    await retireInvalidPools(Blockchain.Ethereum.Network.MAIN)
    await patchLoanOptions(Blockchain.Ethereum.Network.MAIN)
    await updatePoolEthLimmits(Blockchain.Ethereum.Network.MAIN)
    await updatePoolValueLocked(Blockchain.Ethereum.Network.MAIN)

    await retireInvalidPools(Blockchain.Polygon.Network.MAIN)
    await patchLoanOptions(Blockchain.Polygon.Network.MAIN)
    await updatePoolEthLimmits(Blockchain.Polygon.Network.MAIN)
    await updatePoolValueLocked(Blockchain.Polygon.Network.MAIN)

    await retireInvalidPools(Blockchain.Arbitrum.Network.MAINNET)
    await patchLoanOptions(Blockchain.Arbitrum.Network.MAINNET)
    await updatePoolEthLimmits(Blockchain.Arbitrum.Network.MAINNET)
    await updatePoolValueLocked(Blockchain.Arbitrum.Network.MAINNET)
  }
  catch (err) {
    logger.error('JOB_SYNC_POOLS Handling runtime error... ERR:', err)
    throw fault('ERR_SYNC_POOLS', undefined, err)
  }
}
