import appConf from '../../app.conf'
import rethrow from '../../utils/rethrow'
import getRequest from './getRequest'

export default async function getWorkerVersion() {
  const workerUrl = appConf.workerUrl ?? rethrow('Missing worker URL')
  const res = await getRequest('/version', {
    host: workerUrl,
  })

  return res
}
