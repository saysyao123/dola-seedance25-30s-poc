# Codex Control Plane

## Purpose

This layer lets Codex operate Seedance Desktop Studio without mouse automation.

Codex talks to a local CLI. The CLI talks to a loopback-only HTTP control server embedded in Electron. The Electron process remains the owner of account sessions and the desktop UI.

```text
Codex
  ↓ shell
bin/seedance-studio.mjs
  ↓ Bearer token / 127.0.0.1 only
Electron Control Server
  ↓
Account Manager / Task Store / Provider Registry
  ↓
Dola WebView sessions / future providers
```

The control server binds to `127.0.0.1` on an ephemeral port and writes a discovery file containing the port and a random bearer token. It does not listen on LAN interfaces.

## Current Gate Status

This branch implements the control plane and queue contract only.

- D0 desktop shell: implemented in code, still requires user-side Windows verification.
- D1 login persistence: requires user-side verification.
- D2 Dola 10s baseline observation: not passed.
- D3 Dola 30s capability: not passed.

Therefore `tasks dispatch` intentionally returns `D2_GATE_NOT_PASSED` for `dola-web` until D2 is verified. Do not remove this guard by guessing hidden fields.

## Start

From `apps/desktop`:

```powershell
npm install
npm start
```

Keep the desktop application running. In a second terminal, use the Codex-friendly CLI.

## CLI

```powershell
npm run studio -- health
npm run studio -- accounts list
npm run studio -- accounts add --name "Dola A"
npm run studio -- accounts open --account "Dola A"
npm run studio -- providers list
npm run studio -- tasks create --account "Dola A" --provider dola-web --mode t2v --duration 30 --ratio 9:16 --prompt "A cinematic rainy-night scene..."
npm run studio -- tasks list
npm run studio -- tasks get --id <TASK_ID>
npm run studio -- tasks dispatch --id <TASK_ID>
npm run studio -- tasks cancel --id <TASK_ID>
npm run studio -- tasks watch --id <TASK_ID> --interval 5000
```

All CLI output is JSON by default so Codex can parse it reliably.

Until D2 passes, `tasks dispatch` is expected to return `D2_GATE_NOT_PASSED`. This is a verification gate, not a bug.

## Codex Execution Contract

1. Run `npm run check` in `apps/desktop`.
2. Start Electron only when interactive account/session work is required.
3. Use `npm run studio -- ...` instead of UI click automation whenever a CLI command exists.
4. Never read or print the control bearer token, Chromium cookies, access tokens, browser profile contents, Google passwords, or TOTP secrets.
5. Never mark D1/D2/D3 as passed without real evidence from the user's Windows session.
6. For D2, observe one normal user-initiated 10s Seedance 2.5 request first.
7. Only after D2 evidence exists may the `dola-web` provider adapter move from `dispatchReady: false` to an experimental submit implementation.
8. If server responses indicate quota/permission/entitlement denial, stop and report the real error.

## Stable Control API

```text
GET  /health
GET  /v1/accounts
POST /v1/accounts
POST /v1/accounts/:id/activate
GET  /v1/providers
GET  /v1/tasks
POST /v1/tasks
GET  /v1/tasks/:id
POST /v1/tasks/:id/cancel
POST /v1/tasks/:id/dispatch
```

The server is intentionally loopback-only and bearer-token protected.

## Next Implementation Step

D2 should add a Dola observation adapter, not change the CLI contract. After one verified 10s lifecycle, implement the Dola adapter behind `tasks dispatch`. D3 can then test the 30s capability using the same task contract.
