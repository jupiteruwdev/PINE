import express from "express"
import cors from "cors"
import Web3 from "web3"
import config from "./vars.conf"
const app = express()
app.use(cors())
const web3 = new Web3(config.ethRPC)
app.get( "/balances", async ( req, res ) => {
    res.json( {
        ETH: await web3.eth.getBalance(config.ethPoolAddress) |> web3.utils.fromWei |> Number,
        SOL: 0
    } )
} );

// start the Express server
(async () => {

    app.listen( 8080 )
    console.log('started')
})()
