# onUI Doctor Command

## Command

```bash
pnpm --filter @onui/mcp-server doctor
```

Machine-readable output:

```bash
pnpm --filter @onui/mcp-server doctor -- --json
```

Deep mode:

```bash
pnpm --filter @onui/mcp-server doctor -- --deep
```

## Exit Codes

1. `0`: all critical checks pass
2. `1`: warnings only
3. `2`: critical failures

## Checks

1. Node runtime and CLI entry availability.
2. Native host manifest existence and shape.
3. Windows native host registry key (Windows only).
4. Native host roundtrip ping.
5. Store read/write health (`store.v1.json`).
6. Claude MCP registration (`onui-local`).
7. Codex MCP registration (`onui-local`).
8. MCP runtime startup and tool discovery.
9. V2 change-log readiness (`--deep`).

## Repair Model

Doctor is read-only by default and does not auto-fix. Each warning/error includes a direct repair command.
