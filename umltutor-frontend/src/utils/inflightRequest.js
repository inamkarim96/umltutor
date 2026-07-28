/**
 * Deduplicate parallel GET calls (e.g. React StrictMode double-mount).
 * Returns the same promise for identical keys until the request settles.
 */
const inflight = new Map();

export function inflightGet(key, requestFn) {
  if (inflight.has(key)) {
    return inflight.get(key);
  }

  let promise;
  try {
    promise = Promise.resolve(requestFn());
  } catch (err) {
    promise = Promise.reject(err);
  }

  // Silent catch on internal reference to prevent unhandledrejection events on Webpack overlay
  promise.catch(() => {});

  promise.finally(() => {
    // Retain in map for a tiny 100ms window to absorb React StrictMode / fast re-render duplicates
    setTimeout(() => {
      inflight.delete(key);
    }, 100);
  });

  inflight.set(key, promise);
  return promise;
}

export function clearInflight(key) {
  if (key) inflight.delete(key);
  else inflight.clear();
}

