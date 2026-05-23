/** Skip duplicate list fetches within this window (ms). */
export const LIST_FETCH_STALE_MS = 30_000;

export function isListFetchStale(lastFetchedAt, hasData) {
  if (!hasData) return true;
  if (!lastFetchedAt) return true;
  return Date.now() - lastFetchedAt > LIST_FETCH_STALE_MS;
}
