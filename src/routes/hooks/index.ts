import { Router } from 'express'
import _ from 'lodash'
import appConf from '../../app.conf'
import { placeBid } from '../../controllers/hooks'
import { Blockchain } from '../../entities'

const router = Router()

router.post('/place-bid', async (req, res, next) => {
  const { body } = req
  if (appConf.moralisStreamId !== _.get(body, 'streamId')) return res.sendStatus(200)

  const chainId = _.parseInt(_.get(body, 'chainId', '0x1')).toString() as Blockchain.Ethereum.Network

  await placeBid({ body, blockchain: Blockchain.factory({
    network: 'ethereum',
    networkId: chainId,
  }) })

  res.sendStatus(200)
})

export default router
