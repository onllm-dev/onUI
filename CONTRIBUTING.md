# Contributing to onUI

Thanks for contributing.

## Setup

```bash
git clone https://github.com/onllm-dev/onUI.git
cd onUI
pnpm install
pnpm --filter @onui/extension build
```

## Development Workflow

1. Create a branch from `main`.
2. Keep commits focused and small.
3. Run local quality gates before opening a PR:
   ```bash
   pnpm check
   ```
4. Optional but recommended: run coverage checks locally:
   ```bash
   pnpm test:coverage
   ```
5. Open a pull request with clear reproduction and validation notes.

## CI Quality Gates

- Pull requests and pushes to `main` run `.github/workflows/quality-gates.yml`.
- Required checks:
  - `pnpm typecheck`
  - `pnpm test:all`
  - `pnpm build:all`
  - `pnpm test:coverage` (with package coverage thresholds)
- CI runs verification on Node 20 and Node 22.

## Commit Guidelines

- Use clear Conventional Commit prefixes when possible (`feat:`, `fix:`, `docs:`, `chore:`).
- Keep UI and runtime changes split when practical.

## Reporting Bugs

Include:
- URL tested
- expected vs actual behavior
- browser + extension version
- screenshots or short screen recording when possible
