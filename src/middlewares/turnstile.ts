import { NextFunction, Request, Response } from 'express'
import FormData from 'form-data'
import _ from 'lodash'
import appConf from '../app.conf'
import postRequest from '../controllers/utils/postRequest'
import fault from '../utils/fault'

export default async function(req: Request, res: Response, next: NextFunction) {
  const { headers } = req
  const token = _.get(headers, 'cf-turnstile-response')
  const ip = _.get(headers, 'CF-Connecting-IP')

  if (!token) {
    next(fault('ERR_TURNSTILE_RESPONSE_REQUIRED', undefined))
  }
  const formData = new FormData()

  formData.append('secret', appConf.turnstileSecretKey)
  formData.append('response', token)
  if (ip) formData.append('ip', ip)

  const result = await postRequest('https://challenges.cloudflare.com/turnstile/v0/siteverify', formData)

  if (!result.success) {
    next(fault('ERR_INVALID_TURNSTILE_RESPONSE', undefined))
  }
  else {
    next()
  }
}
