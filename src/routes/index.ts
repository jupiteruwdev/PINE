import { Router } from 'express'
import appConf from '../app.conf'
import getWorkerVersion from '../controllers/utils/getWorkerVersion'
import v0Router from './v0'

const router = Router()

router.get('/health', (req, res) => res.sendStatus(200))

router.get('/version', async (req, res) => {
  res.send({
    core: `${appConf.version}/${appConf.build}`,
    worker: await getWorkerVersion(),
  })
})

router.use('/v0', v0Router)
router.use('/', v0Router)

export default router
