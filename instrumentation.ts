// Next.js instrumentation hook — runs once before the server starts.
// Node.js v22+ exposes localStorage as a global but without proper methods
// unless --localstorage-file is provided. This confuses @supabase/auth-js's
// supportsLocalStorage() check, which mistakenly treats the broken object as
// a real storage and then fails on localStorage.getItem. Replace it with a
// no-op in-memory stub so supportsLocalStorage() correctly returns false.
export async function register() {
  if (typeof globalThis.localStorage !== "undefined") {
    const _store: Record<string, string> = {};
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (key: string) => _store[key] ?? null,
        setItem: (key: string, value: string) => { _store[key] = value; },
        removeItem: (key: string) => { delete _store[key]; },
        clear: () => { Object.keys(_store).forEach(k => delete _store[k]); },
        get length() { return Object.keys(_store).length; },
        key: (i: number) => Object.keys(_store)[i] ?? null,
      },
      writable: true,
      configurable: true,
    });
  }
}
