import appConf from '../../app.conf'
import rethrow from '../../utils/rethrow'
import getRequest from './getRequest'
import { GoogleAuth } from 'google-auth-library'
const auth = new GoogleAuth()

export default async function getWorkerVersion() {
  const workerUrl = appConf.workerUrl ?? rethrow('Missing worker URL')
  let headers = {}

  if (appConf.workerCloudRunUrl) {
    const client = await auth.getIdTokenClient(appConf.workerCloudRunUrl)
    const clientHeaders = await client.getRequestHeaders()
    headers = { 'Authorization': clientHeaders['Authorization'] }
  }
  const res = await getRequest('/version', {
    host: workerUrl,
    headers,
  })

  return res
}
