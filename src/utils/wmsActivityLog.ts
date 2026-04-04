/** Prefix for developer-visible operational alerts in activityLogs (Warehouse Operations highlights these in red). */
export const WMS_ALERT_PREFIX = '[WMS_ALERT]';

export function isWmsAlertDetail(detail: string): boolean {
  return typeof detail === 'string' && detail.trimStart().startsWith(WMS_ALERT_PREFIX);
}

/** Compact string for logging Firestore / JS errors (avoid huge objects). */
export function formatLogError(e: unknown): string {
  if (e && typeof e === 'object' && 'code' in e) {
    const o = e as { code?: string; message?: string };
    return `[code=${o.code ?? '?'}] ${o.message ?? String(e)}`;
  }
  if (e instanceof Error) {
    return `${e.name}: ${e.message}`;
  }
  try {
    const s = JSON.stringify(e);
    return s.length > 500 ? `${s.slice(0, 500)}…` : s;
  } catch {
    return String(e);
  }
}
