import Blockchain from '../entities/lib/Blockchain'
import failure from '../utils/failure'
import getPoolContract from './getPoolContract'
import getPools from './getPools'
import getPoolCapacity from './getPoolCapacity'
import web3 from 'web3'

const flashLoanSourceContractAddresses: { [key: number]: any } = {
  4: '0x8eE816b1B3B3E5F2dE1d8344A7Dc69AA16074314',
  1: '0x63ca18f8cb75e28f94cf81901caf1e39657ea256',
}

export default async function getFlashLoanSourceContractAddress({ blockchain, poolAddress, flashLoanAmount }: {blockchain: Blockchain; poolAddress: string; flashLoanAmount: string}) : Promise<string> {
  const contract = await getPoolContract({ blockchain, poolAddress })
  const fundSource = await contract.methods._fundSource().call()
  const pools = (await getPools({ blockchains: { ethereum: blockchain.networkId } }))
    .filter(e => e.version > 1 && e.address !== poolAddress && e.valueLocked.amount.minus(e.utilization.amount).gte(web3.utils.fromWei(flashLoanAmount)))
  const poolsWithFundsource = (await Promise.all(pools.map(async e => {
    const tmpContract = await getPoolContract({ blockchain, poolAddress: e.address })
    const fundSource = await tmpContract.methods._fundSource().call()
    return {
      ...e,
      fundSource,
    }
  }))).filter(e => e.fundSource !== fundSource)
  if (poolsWithFundsource.length > 0) {
    return poolsWithFundsource[0].address
  }
  else {
    const capacityEth = await getPoolCapacity({ blockchain, poolAddress: flashLoanSourceContractAddresses[Number(blockchain.networkId)] })
    if (capacityEth.amount.gte(web3.utils.fromWei(flashLoanAmount))) return flashLoanSourceContractAddresses[Number(blockchain.networkId)]
    else throw failure('NO_FLASHLOAN_POOL')
  }
}
