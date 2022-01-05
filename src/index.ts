import express from "express"
import cors from "cors"
import Web3 from "web3"
import config from "./vars.conf"
import { getAllV1LoanEvents, getCryptoPrice, getLoan } from "./helper"
const app = express()
app.use(cors())
app.get( "/eth-balance", async ( req, res ) => {
  const web3 = new Web3((config.ethRPC as any)[Number(req.query.network_id)])
  const poolAddress = req.query.pool_address as string
  const loanIDs = await getAllV1LoanEvents(web3, poolAddress) |> (e => e.map(x => (x as any).returnValues.nftID) |> (x => new Set(x)))
  let ethUtilization = 0
  await Promise.all(Array.from(loanIDs).map(async (e: number) => {
      const loan = await getLoan(web3, poolAddress, e)
      ethUtilization += ((loan.borrowedWei  |> web3.utils.fromWei |> Number) - (loan.returnedWei  |> web3.utils.fromWei |> Number) )
    }
  ))
  const ethCapacity = await web3.eth.getBalance(poolAddress)  |> web3.utils.fromWei |> Number
  res.json( {
      eth_tvl: ethCapacity + ethUtilization,
      eth_capacity: ethCapacity,
      eth_current_utilization: ethUtilization,
      utilization_ratio: ethUtilization / (ethCapacity + ethUtilization),
      block_number: await web3.eth.getBlockNumber()
  } )
} );

app.get( "/global-stats", async ( req, res ) => {
  const ethPrice = await getCryptoPrice('ETH')
  const sumOfArray = (y:Array<number>)=>y.reduce((previousValue: number, currentValue: number) => previousValue + currentValue)
  const web3 = new Web3((config.ethRPC as any)[1])
  const ethTVL = await Promise.all(config.v1pools.map(async e => (await web3.eth.getBalance(e)) |> web3.utils.fromWei |> Number)) |> sumOfArray
  const loans = await Promise.all(config.v1pools.map(e => getAllV1LoanEvents(web3, e)))
  const totalBorrowed = loans |> (y => y.flatMap(e => e.map(x => (x as any).returnValues.loan[4] |> web3.utils.fromWei |> Number))) |> sumOfArray
  const loanIDs = loans |> (y => y.map(e => e.map(x => (x as any).returnValues.nftID) |> (x => new Set(x))))
  let ethUtilization = 0
  for (const idx in config.v1pools) {
    await Promise.all(Array.from(loanIDs[idx]).map(async (e: number) => {
        const loan = await getLoan(web3, config.v1pools[idx], e)
        ethUtilization += ((loan.borrowedWei  |> web3.utils.fromWei |> Number )- (loan.returnedWei  |> web3.utils.fromWei |> Number))
      }
    ))
  }
  res.json( {
    usd_capacity: ethTVL * ethPrice.price,
    usd_tvl: ethUtilization* ethPrice.price + ethTVL * ethPrice.price,
    usd_current_utilization: ethUtilization* ethPrice.price,
    utilization_ratio: ethUtilization* ethPrice.price / (ethUtilization* ethPrice.price + ethTVL * ethPrice.price),
    usd_total_lent_historical: totalBorrowed * ethPrice.price,
    block_number: await web3.eth.getBlockNumber()
  })
} );

// start the Express server
(async () => {
    app.listen( 8080 )
    console.log('started')
})()
