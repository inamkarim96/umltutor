/**
 * Deduplicate parallel GET calls (e.g. React StrictMode double-mount).
 * Returns the same promise for identical keys until the request settles.
 */
const inflight = new Map();

export function inflightGet(key, requestFn) {
  if (inflight.has(key)) {
    return inflight.get(key);
  }
  const promise = Promise.resolve()
    .then(requestFn)
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, promise);
  return promise;
}

export function clearInflight(key) {
  if (key) inflight.delete(key);
  else inflight.clear();
}
