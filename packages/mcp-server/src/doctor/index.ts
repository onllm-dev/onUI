export interface DoctorOptions {
  json?: boolean;
  deep?: boolean;
}

export interface DoctorReport {
  status: 'ok' | 'warning' | 'error';
  checks: Array<{
    name: string;
    status: 'ok' | 'warning' | 'error';
    message: string;
    fix?: string;
  }>;
}

export async function runDoctor(options: DoctorOptions = {}): Promise<number> {
  const report: DoctorReport = {
    status: 'warning',
    checks: [
      {
        name: 'doctor.bootstrap',
        status: 'warning',
        message: 'Doctor checks are scaffolded; deeper checks will be added in follow-up commits.',
      },
      {
        name: 'doctor.mode',
        status: 'ok',
        message: options.deep ? 'Deep mode requested.' : 'Default mode requested.',
      },
    ],
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(`onui doctor: ${report.status}\n`);
    for (const check of report.checks) {
      process.stdout.write(`- [${check.status}] ${check.name}: ${check.message}\n`);
      if (check.fix) {
        process.stdout.write(`  fix: ${check.fix}\n`);
      }
    }
  }

  return 1;
}
