/**
 * Runs tasks over an array of items with a fixed maximum concurrency limit.
 * Preserves result ordering corresponding to input items.
 */
export async function asyncPool<T, R>(
  concurrency: number,
  items: readonly T[],
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return []

  const limit = Math.max(1, Math.floor(concurrency))
  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function runWorker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++
      const item = items[currentIndex]!
      results[currentIndex] = await worker(item, currentIndex)
    }
  }

  const workerCount = Math.min(limit, items.length)
  const workers = Array.from({length: workerCount}, () => runWorker())
  await Promise.all(workers)

  return results
}
