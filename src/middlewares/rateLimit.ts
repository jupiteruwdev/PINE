import { NextFunction, Request, Response } from 'express'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import fault from '../utils/fault'

const opts = {
  points: 200, // 6 points
  duration: 1, // Per second
}

const rateLimiter = new RateLimiterMemory(opts)

export default function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const remoteAddress = req.connection.remoteAddress as string
  rateLimiter.consume(remoteAddress) // consume 2 points
    .then(rateLimiterRes => {
      // 2 points consumed
      next()
    })
    .catch(rateLimiterRes =>
      // Not enough points to consume
      res.status(429).send({
        error: fault('TOO_MANY_REQUESTS', undefined),
      })
    )
}
