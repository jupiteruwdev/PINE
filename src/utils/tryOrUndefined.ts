export default function tryOrUndefined<T>(expression: () => T): T | undefined {
  try {
    return expression()
  }
  catch (err) {
    return undefined
  }
}
