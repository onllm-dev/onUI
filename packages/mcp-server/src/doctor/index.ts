import { checkClaudeMcpRegistration } from './checks/claude-mcp.js';
import { checkCodexMcpRegistration } from './checks/codex-mcp.js';
import { checkMcpRuntime } from './checks/mcp-runtime.js';
import { checkNativeHostManifest } from './checks/native-host-manifest.js';
import { checkNativeHostRoundtrip } from './checks/native-host-roundtrip.js';
import { checkNodeRuntime } from './checks/node-runtime.js';
import { checkStoreHealth } from './checks/store-health.js';
import { checkV2SyncReadiness } from './checks/v2-sync.js';
import { checkWindowsRegistry } from './checks/windows-registry.js';
import type { CheckResult, CheckStatus } from './types.js';

export interface DoctorOptions {
  json?: boolean;
  deep?: boolean;
  cliPath?: string | undefined;
}

export interface DoctorReport {
  status: CheckStatus;
  checks: CheckResult[];
}

function computeOverallStatus(checks: CheckResult[]): CheckStatus {
  if (checks.some((check) => check.status === 'error')) {
    return 'error';
  }
  if (checks.some((check) => check.status === 'warning')) {
    return 'warning';
  }
  return 'ok';
}

function statusToExitCode(status: CheckStatus): number {
  if (status === 'error') {
    return 2;
  }
  if (status === 'warning') {
    return 1;
  }
  return 0;
}

function printReport(report: DoctorReport): void {
  process.stdout.write(`onui doctor: ${report.status}\n`);

  for (const check of report.checks) {
    process.stdout.write(`- [${check.status}] ${check.name}: ${check.message}\n`);
    if (check.fix) {
      process.stdout.write(`  fix: ${check.fix}\n`);
    }
  }
}

export async function runDoctor(options: DoctorOptions = {}): Promise<number> {
  const cliPath = options.cliPath ?? process.argv[1];
  if (!cliPath) {
    throw new Error('Unable to detect CLI path for doctor checks.');
  }

  const checks: CheckResult[] = [];

  checks.push(await checkNodeRuntime(cliPath));
  checks.push(await checkNativeHostManifest());
  checks.push(await checkWindowsRegistry());
  checks.push(await checkNativeHostRoundtrip());
  checks.push(await checkStoreHealth());
  checks.push(await checkClaudeMcpRegistration());
  checks.push(await checkCodexMcpRegistration());
  checks.push(await checkMcpRuntime(cliPath));

  if (options.deep) {
    checks.push(await checkV2SyncReadiness());
  }

  const report: DoctorReport = {
    status: computeOverallStatus(checks),
    checks,
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    printReport(report);
  }

  return statusToExitCode(report.status);
}
