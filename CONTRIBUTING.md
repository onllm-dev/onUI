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
3. Run build before opening a PR:
   ```bash
   pnpm --filter @onui/extension build
   ```
4. Open a pull request with clear reproduction and validation notes.

## Commit Guidelines

- Use clear Conventional Commit prefixes when possible (`feat:`, `fix:`, `docs:`, `chore:`).
- Keep UI and runtime changes split when practical.

## Reporting Bugs

Include:
- URL tested
- expected vs actual behavior
- browser + extension version
- screenshots or short screen recording when possible
