import { Router } from 'express'
import appConf from '../../app.conf'
import fault from '../../utils/fault'
import { deleteRedisCache, setRedisCache } from '../../utils/redis'
import { getString } from '../utils/query'

const router = Router()

router.post('/set-data', async (req, res, next) => {
  try {
    const authorization = req.headers.authorization

    if (authorization !== appConf.redisAuthKey) {
      return res.status(401).send('unauthorized')
    }

    const redisKey = getString(req.body, 'key')
    const data = req.body.data

    if (data) {
      await setRedisCache(redisKey, data)
    }
    else {
      await deleteRedisCache(redisKey)
    }

    res.status(200).send({ success: true })
  }
  catch (err) {
    next(fault('ERR_API_SET_REDIS_CACHE', undefined, err))
  }
})

export default router
