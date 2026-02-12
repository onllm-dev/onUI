import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { getNativeHostManifestPath } from '../../store/path.js';
import type { CheckResult } from '../types.js';

interface NativeResponse {
  ok: boolean;
  error?: string | null;
  data?: unknown;
}

async function pingNativeHostExecutable(hostPath: string): Promise<NativeResponse> {
  return new Promise<NativeResponse>((resolve, reject) => {
    const child = spawn(hostPath, [], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });

    const request = Buffer.from(
      JSON.stringify({
        type: 'PING',
        requestId: 'doctor-ping',
        sentAt: Date.now(),
        payload: {},
      }),
      'utf8'
    );

    const header = Buffer.alloc(4);
    header.writeUInt32LE(request.length, 0);

    const chunks: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    child.on('error', reject);

    child.stdin.write(header);
    child.stdin.write(request);
    child.stdin.end();

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('Native host roundtrip timed out'));
    }, 4000);

    child.on('close', () => {
      clearTimeout(timeout);

      const output = Buffer.concat(chunks);
      if (output.length < 4) {
        reject(new Error('Native host did not return a valid response'));
        return;
      }

      const messageLength = output.readUInt32LE(0);
      const payload = output.subarray(4, 4 + messageLength).toString('utf8');
      resolve(JSON.parse(payload) as NativeResponse);
    });
  });
}

export async function checkNativeHostRoundtrip(): Promise<CheckResult> {
  try {
    const manifestPath = getNativeHostManifestPath();
    const manifestRaw = await readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestRaw) as { path?: string };

    if (!manifest.path) {
      return {
        name: 'native.roundtrip',
        status: 'error',
        message: `Manifest at ${manifestPath} does not define a host path.`,
        fix: 'Rerun setup: pnpm --filter @onui/mcp-server run setup',
      };
    }

    const response = await pingNativeHostExecutable(manifest.path);
    if (!response.ok) {
      return {
        name: 'native.roundtrip',
        status: 'error',
        message: `Native host returned error: ${response.error ?? 'unknown error'}`,
        fix: 'Rerun setup and verify Node runtime path in native host wrapper.',
      };
    }

    return {
      name: 'native.roundtrip',
      status: 'ok',
      message: 'Native host roundtrip succeeded.',
    };
  } catch (error) {
    return {
      name: 'native.roundtrip',
      status: 'warning',
      message: `Native host roundtrip failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      fix: 'Run setup and ensure Chrome native host wrapper is executable.',
    };
  }
}
