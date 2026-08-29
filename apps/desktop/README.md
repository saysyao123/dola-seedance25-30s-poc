# Seedance Desktop Studio v0.2

Clean-room Windows desktop POC for multi-account Dola sessions plus a Codex-operable local task control plane.

## Implemented in this branch

- Electron desktop shell.
- Multiple Dola account containers.
- One persistent Chromium partition per account.
- One long-lived Dola WebView per account.
- Manual visible login; no Google password/TOTP storage.
- Account switching and per-account session clearing.
- Local JSON task queue.
- Seedance task form in the desktop UI.
- Loopback-only control server with random bearer token.
- Machine-readable CLI for Codex: accounts/providers/tasks.
- Provider gate that blocks automatic Dola dispatch until D2 is actually verified.

## Run

```powershell
cd apps/desktop
npm install
npm run check
npm start
```

In another terminal:

```powershell
npm run studio -- health
npm run studio -- accounts list
```

See `../../docs/CODEX_CONTROL_PLANE.md` for the complete Codex workflow.

## D0 / D1 acceptance

```text
[ ] Desktop launches on Windows x64
[ ] Account A can log in manually
[ ] Account B can log in manually
[ ] A/B sessions do not leak into each other
[ ] Switching accounts does not require re-login
[ ] Restart keeps both Chromium sessions
[ ] Clear session only clears the selected account
[ ] npm run studio -- health works while desktop app is running
[ ] Codex CLI can list/open accounts and create/list/cancel local tasks
```

## Important current limitation

The local control plane is implemented, but the Dola automatic Seedance provider is intentionally not enabled yet.

`tasks dispatch` for `dola-web` will return `D2_GATE_NOT_PASSED` until a real user session verifies the normal Seedance 2.5 10s submit/SSE/conversation/result lifecycle.

This keeps the product architecture stable without pretending the unverified provider path is complete.
