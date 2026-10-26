let count = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const busyCount = () => count;
export const isBusy = () => count > 0;

export function subscribeBusy(l: () => void): () => void {
  listeners.add(l);
  return () => void listeners.delete(l);
}

/** 通信・ドライバ操作の前後でカウントを増減する。例外でも必ず戻す */
export async function track<T>(fn: () => Promise<T>): Promise<T> {
  count++;
  emit();
  try {
    return await fn();
  } finally {
    count--;
    emit();
  }
}
