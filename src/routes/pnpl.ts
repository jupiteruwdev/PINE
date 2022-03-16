import { Router } from 'express'
import { serializePNPLTerms } from '../entities/lib/PNPLTerms'
import failure from '../utils/failure'
import getPNPLTermsByUrl from '../core/getPNPLTermsByUrl'

const router = Router()

router.get('/terms', async (req, res, next) => {
  try {
    const url = req.query.url?.toString()
    if (!url) throw failure('INVALID_PARAMS')

    const parsedURL = new URL(url)
    const pnplTerms = await getPNPLTermsByUrl({ parsedURL })

    const payload = serializePNPLTerms(pnplTerms)
    res.status(200).json(payload)
  }
  catch (err) {
    next(err)
  }
})

export default router
