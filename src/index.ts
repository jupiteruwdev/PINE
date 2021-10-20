import express from "express"

const app = express()

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
