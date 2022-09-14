import appConf from '../../app.conf'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import postRequest from './postRequest'

export default async function scheduleWorker(taskId: string, params?: Record<string, any>) {
  const workerUrl = appConf.workerUrl ?? rethrow('Missing worker URL')

  try {
    const res = await postRequest('/schedule', {
      taskId,
      ...params ?? {},
    }, {
      host: workerUrl,
    })

    logger.info(`Scheduling worker for task<${taskId}>... OK: Response=${res}`)
  }
  catch (err) {
    logger.error(`Scheduling worker for task<${taskId}>... ERR`)
    if (logger.isErrorEnabled() && !logger.silent) console.error(err)
  }
}
