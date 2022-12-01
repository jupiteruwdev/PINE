export function timeOutFetch<T>(promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject
    }, 5000)
    promise.then(resolve).catch(reject)
  })
}
