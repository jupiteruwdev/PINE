import rethrow from './rethrow'

/**
 * Repeatedly invokes an asynchronous function.
 *
 * @param func - The async function to repeatedly invoke.
 * @param count - The number of times the function should be invoked. If less than 0, the function
 *                will repeat forever.
 */
export default async function repeatAsync(func: (step: number) => Promise<void>, count: number) {
  let i = 0
  while ((count < 0) || (i < count)) await func(i++)
}

export async function retryPromise(func: () => Promise<any>, maxRetries = 5, initialDelay = 1000, factor = 2) {
  let retries = 0
  while (retries < maxRetries) {
    try {
      const res = await func()
      return res
    }
    catch (err: any) {
      console.error(`Promise failed: ${err.message}. Retrying...`)
      retries++
      await new Promise(resolve => setTimeout(resolve, initialDelay * Math.pow(factor, retries)))
    }
  }

  throw rethrow(`Promise failed after ${retries} retries`)
}
