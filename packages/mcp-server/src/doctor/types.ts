export type CheckStatus = 'ok' | 'warning' | 'error';

export interface CheckResult {
  name: string;
  status: CheckStatus;
  message: string;
  fix?: string;
  details?: Record<string, unknown>;
}
