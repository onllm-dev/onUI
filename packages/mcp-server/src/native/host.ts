import { stdin, stdout } from 'node:process';
import { createResponse, isNativeRequest, type NativeRequest, type NativeResponse } from './protocol.js';
import { StoreRepository } from '../store/repository.js';
import { getStorePath } from '../store/path.js';
import type { DeletePagePayload, GetChangesSincePayload, UpsertPageSnapshotPayload } from './protocol.js';

function writeMessage(message: NativeResponse): void {
  const payload = Buffer.from(JSON.stringify(message), 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(payload.length, 0);
  stdout.write(header);
  stdout.write(payload);
}

export async function handleNativeRequest(
  repository: StoreRepository,
  request: NativeRequest
): Promise<NativeResponse> {
  try {
    switch (request.type) {
      case 'PING':
        return createResponse(request.requestId, true, { pong: true, at: Date.now() });

      case 'UPSERT_PAGE_SNAPSHOT': {
        const payload = request.payload as UpsertPageSnapshotPayload;
        const result = await repository.upsertPageSnapshot({
          pageUrl: payload.pageUrl,
          pageTitle: payload.pageTitle,
          annotations: payload.annotations,
        });
        return createResponse(request.requestId, true, result);
      }

      case 'DELETE_PAGE': {
        const payload = request.payload as DeletePagePayload;
        const result = await repository.deletePageSnapshot(payload.pageUrl);
        return createResponse(request.requestId, true, result);
      }

      case 'GET_CHANGES_SINCE': {
        const payload = (request.payload as GetChangesSincePayload | undefined) ?? {};
        const result = await repository.getChangesSince(payload.since, payload.limit);
        return createResponse(request.requestId, true, result);
      }

      default:
        return createResponse(request.requestId, false, undefined, `Unsupported request type: ${request.type}`);
    }
  } catch (error) {
    return createResponse(
      request.requestId,
      false,
      undefined,
      error instanceof Error ? error.message : 'Unknown native host error'
    );
  }
}

export async function runNativeHost(): Promise<void> {
  const repository = new StoreRepository(getStorePath());
  let buffer = Buffer.alloc(0);

  stdin.on('data', (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 4) {
      const messageLength = buffer.readUInt32LE(0);
      if (buffer.length < 4 + messageLength) {
        return;
      }

      const messageBuffer = buffer.subarray(4, 4 + messageLength);
      buffer = buffer.subarray(4 + messageLength);

      let parsed: unknown;
      try {
        parsed = JSON.parse(messageBuffer.toString('utf8'));
      } catch {
        writeMessage(createResponse('unknown', false, undefined, 'Invalid JSON payload'));
        continue;
      }

      if (!isNativeRequest(parsed)) {
        writeMessage(createResponse('unknown', false, undefined, 'Invalid request envelope'));
        continue;
      }

      void handleNativeRequest(repository, parsed).then((response) => {
        writeMessage(response);
      });
    }
  });

  stdin.resume();
}
