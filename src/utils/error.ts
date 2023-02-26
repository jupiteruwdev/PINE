import SuperError from '@andrewscwei/super-error'

export default function rootCause(error: SuperError): number {
  while (error.cause) {
    error = error.cause as SuperError
  }

  switch (error.code) {
  case 'ERR_UNSUPPORTED_BLOCKCHAIN':
  case 'ERR_TURNSTILE_RESPONSE_REQUIRED':
  case 'ERR_INVALID_TURNSTILE_RESPONSE':
  case 'NO_SUCH_CONTRACT':
  case 'ERR_UNKNOWN_POOL':
  case 'ERR_VERIFING_POOL':
    return 400
  default:
    return 500
  }
}