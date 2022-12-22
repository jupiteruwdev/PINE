import appConf from '../../app.conf'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import postRequest from './postRequest'
import { GoogleAuth } from 'google-auth-library'
const auth = new GoogleAuth()

export default async function scheduleWorker(taskId: string, params?: Record<string, any>) {
  const workerUrl = appConf.workerUrl ?? rethrow('Missing worker URL')
  let headers = {}

  if (appConf.workerCloudRunUrl) {
    const client = await auth.getIdTokenClient(appConf.workerCloudRunUrl)
    const clientHeaders = await client.getRequestHeaders()
    headers = { 'Authorization': clientHeaders['Authorization'] }
  }

  try {
    const res = await postRequest('/schedule', {
      taskId,
      ...params ?? {},
    }, {
      host: workerUrl,
      headers,
    })

    logger.info(`Scheduling worker for task<${taskId}>... OK: Response=${res}`)
  }
  catch (err) {
    logger.error(`Scheduling worker for task<${taskId}>... ERR`)
    if (logger.isErrorEnabled() && !logger.silent) console.error(err)
  }
}
