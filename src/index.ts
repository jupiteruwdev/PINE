import express from "express"
import cors from "cors"
import Web3 from "web3"
import config from "./vars.conf"
const app = express()
app.use(cors())
app.get( "/eth-balance", async ( req, res ) => {
  const web3 = new Web3((config.ethRPC as any)[Number(req.query.network_id)])
    res.json( {
        eth_balance: await web3.eth.getBalance(req.query.pool_address as string) |> web3.utils.fromWei |> Number,
        block_number: await web3.eth.getBlockNumber()
    } )
} );

// start the Express server
(async () => {

    app.listen( 8080 )
    console.log('started')
})()
