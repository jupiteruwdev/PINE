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
