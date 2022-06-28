import { Router } from 'express'
import getPNPLTermsByUrl from '../core/getPNPLTermsByUrl'
import { PNPLTerms } from '../entities'
import failure from '../utils/failure'
import { getString } from '../utils/query'

const router = Router()

router.get('/terms', async (req, res, next) => {
  try {
    const url = getString(req.query, 'url')
    const parsedURL = new URL(url)
    const pnplTerms = await getPNPLTermsByUrl({ parsedURL })
    const payload = PNPLTerms.serialize(pnplTerms)

    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_PNPL_TERMS_FAILURE', err))
  }
})

export default router
