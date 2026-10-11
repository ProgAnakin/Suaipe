/**
 * Rejects with a TimeoutError if `promise` has not settled after `ms`.
 *
 * `fetch` — and therefore every Supabase call — has no timeout of its own. On a flaky in-store
 * network a request can simply never answer, which would leave a spinner or a disabled button
 * on a kiosk that nobody is there to reload. The underlying request is not cancelled (use an
 * AbortSignal for that); its late result is ignored.
 */
export class TimeoutError extends Error {
  constructor(what: string, ms: number) {
    super(`${what} timed out after ${ms} ms`);
    this.name = "TimeoutError";
  }
}

export function withTimeout<T>(promise: PromiseLike<T>, ms: number, what = "request"): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(what, ms)), ms);
    Promise.resolve(promise).then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}
