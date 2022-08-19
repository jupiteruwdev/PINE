import { Router } from 'express'
import appConf from '../app.conf'
import v0Router from './v0'

const router = Router()

router.get('/health', (req, res) => res.sendStatus(200))
router.get('/version', (req, res) => res.send(`${appConf.version}/${appConf.build}`))
router.use('/v0', v0Router)
router.use('/', v0Router)

export default router
