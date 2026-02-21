# Self-Hosted Runner Security

This repository is public. Treat self-hosted runners as high-risk infrastructure.

## Baseline

- Runner user must be unprivileged (no `sudo`).
- Runner machine must be dedicated to CI only.
- Do not store production secrets, SSH keys, or cloud credentials on the runner host.
- Self-hosted jobs must not run automatically on pull requests.

## Current Policy

- Runner label set: `self-hosted`, `Linux`, `X64`, `staging`, `onui`
- Self-hosted workflow job runs only on `workflow_dispatch`.
- `main` branch protection is enabled with required status checks and PR review requirements.

## Host Hardening Checklist

- Firewall enabled (`ufw`): default deny inbound, allow only `OpenSSH`.
- `fail2ban` enabled for SSH brute-force mitigation.
- SSH password authentication disabled.
- Keep the runner and OS packages updated.

## Operational Guidance

- If suspicious activity is detected, destroy and rebuild the VPS.
- Rotate repository secrets after any runner compromise suspicion.
- Prefer short-lived/disposable runner hosts for stronger isolation.
