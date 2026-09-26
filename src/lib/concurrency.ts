export async function runWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  
  const worker = async () => {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await task(items[currentIndex] as T);
    }
  };

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);

  return results;
}
