const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export function saveToStorage<T>(key: string, value: T) {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {}
}

export function loadFromStorage<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (_) {
    return fallback;
  }
}

export function removeFromStorage(key: string) {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(key);
  } catch (_) {}
}



