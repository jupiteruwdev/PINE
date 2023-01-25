import * as crypto from 'crypto'
import { logger } from 'ethers'
import { Router } from 'express'
import _ from 'lodash'
import BidTreasuryForwarder from '../../abis/BidTreasuryForwarder.json' assert { type: 'json' }
import appConf from '../../app.conf'
import { placeBid } from '../../controllers/hooks'
import getEthWeb3 from '../../controllers/utils/getEthWeb3'
import { Blockchain } from '../../entities'

const router = Router()

type VerifySenderParams = {
  body: string
  signature: string
  signingKey: string
}

const verifySender = ({ body, signature, signingKey }: VerifySenderParams) => {
  const hmac = crypto.createHmac('sha256', signingKey) // Create a HMAC SHA256 hash using the signing key
  hmac.update(body, 'utf8') // Update the token hash with the request body using utf8
  const digest = hmac.digest('hex')
  return signature === digest
}

router.post('/place-bid', async (req, res, next) => {
  const { body } = req
  const rawData = Buffer.from(JSON.stringify(body)).toString('utf8')
  const signature = _.get(req.headers, 'x-alchemy-signature') as string
  if (verifySender({ body: rawData, signature, signingKey: appConf.alchemySigningKey })) return res.sendStatus(200)

  const network = _.get(body, 'event.network')
  const blockchain = Blockchain.factory({
    network: 'ethereum',
    networkId: network === 'ETH_MAINNET' ? Blockchain.Ethereum.Network.MAIN : Blockchain.Ethereum.Network.GOERLI,
  })
  if (_.get(body, 'event.activity[0].category') !== 'external') {
    logger.info(`Place bid on blockchain <${JSON.stringify(blockchain)}>... SKIP(unconfirmed logs)`)
    return res.sendStatus(200)
  }

  const blockNumber = _.parseInt(_.get(body, 'event.activity[0].blockNum'))
  const web3 = getEthWeb3(blockchain.networkId)
  const treasuryContract = new web3.eth.Contract(BidTreasuryForwarder as any, _.get(appConf.bidTreasuryContractAddress, blockchain.networkId))
  const events = await treasuryContract.getPastEvents('DEPOSIT_ETH_FOR_BID', {
    fromBlock: blockNumber,
    toBlock: blockNumber,
  })

  if (!events.length) return res.sendStatus(200)

  await placeBid({ body: events[0], blockchain })

  res.sendStatus(200)
})

export default router
