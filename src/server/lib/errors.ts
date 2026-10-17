export function protectedApiErrorStatus(error: unknown): number {
  const message = String((error as any)?.message || '');
  if (['unauthorized', 'Invalid Supabase access token', 'session_revoked'].includes(message)) return 401;
  if (message === 'account_inactive') return 403;
  return 503;
}

export function httpError(status: number, message: string) {
  const err = new Error(message) as Error & { status?: number };
  err.status = status;
  return err;
}
