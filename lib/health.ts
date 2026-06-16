/** Lightweight health summary used by the /api/health smoke endpoint. */
export function healthStatus() {
  return {
    status: 'ok' as const,
    service: 'creator-crm',
    timestamp: new Date().toISOString(),
  };
}
