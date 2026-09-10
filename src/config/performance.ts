import { getPerformance, trace, type PerformanceTrace } from 'firebase/performance';
import { app } from './firebase';

/** Firebase Performance Monitoring (web). No-op when unavailable (SSR/tests). */
export const perf = typeof window !== 'undefined' ? getPerformance(app) : undefined;

export function startPerfTrace(name: string): PerformanceTrace | null {
  if (!perf) return null;
  const t = trace(perf, name);
  t.start();
  return t;
}

export async function runWithPerfTrace<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const t = startPerfTrace(name);
  try {
    return await fn();
  } finally {
    t?.stop();
  }
}
