import { Router } from 'express'
import appConf from '../app.conf'
import hookRouter from './hooks'
import v0Router from './v0'
import v1Router from './v1'

const router = Router()

router.get('/health', (req, res) => res.sendStatus(200))

router.get('/version', async (req, res) => {
  res.send({
    core: `${appConf.version}/${appConf.build}`,
  })
})

router.use('/v0', v0Router)
router.use('/v1', v1Router)
router.use('/hook', hookRouter)
router.use('/', v0Router)

export default router
