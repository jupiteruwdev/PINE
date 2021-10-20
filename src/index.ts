import express from "express"
import cors from "cors"
const app = express()
app.use(cors())
app.get( "/balances", async ( req, res ) => {
    res.json( {
        ETH: 0,
        SOL: 0
    } )
} );

// start the Express server
(async () => {

    app.listen( 8080 )
    console.log('started')
})()
