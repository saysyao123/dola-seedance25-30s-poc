# Test Log

所有真实测试按时间追加，不覆盖历史结果。

## 2026-08-29 — Repository bootstrap

- Gate: G0
- Status: PASS
- Result:
  - Public test repository confirmed.
  - Safety rules established.
  - Raw credentials/captures/browser profiles excluded from Git.
  - POC acceptance gates defined.
- Evidence: repository files and commit history.

## 2026-08-29 — CI static validation

- Gate: pre-G1 static validation
- Status: PASS
- Environment: GitHub Actions / Ubuntu / Node.js 20
- Result:
  - `npm install` passed.
  - `npm run typecheck` passed.
  - `npm test` passed.
  - Redaction unit tests passed.
- Scope note:
  - This validates code compilation and sanitizer behavior only.
  - It does **not** prove Dola browser connectivity, request capture, Seedance 2.5 lifecycle mapping, or 30-second generation.

## 2026-08-29 — Default architecture switched to current Chrome Extension

- Gate: pre-G1 architecture validation
- Status: IMPLEMENTED / awaiting user browser test
- Result:
  - Default Playwright/new-profile path removed from normal user flow.
  - `START_WEB.bat` removed.
  - Debug localhost launcher renamed to `DEBUG_START_WEB.bat`.
  - `extension/manifest.json` switched to Manifest V3 MAIN-world `page-hook.js` at `document_start`.
  - `content.js` remains isolated-world UI/storage layer.
  - Inspector defaults to capture ON for first use.
  - Existing Google/Dola login state in the user's current Chrome is preserved by design.
  - fetch/XHR request and text/json response observation is sanitized before being stored by the extension UI.
- Scope note:
  - Static architecture is implemented.
  - G1 is not PASS until the extension is manually loaded in the user's current Chrome and the Inspector is visibly present on Dola.

## 下一测试：G1 Current Chrome Extension

目标：

1. 在用户平时正在使用、已经登录 Google 的 Chrome 打开 `chrome://extensions/`。
2. 开启开发者模式并“加载已解压的扩展程序”。
3. 选择仓库中的 `extension` 文件夹。
4. 在同一个 Chrome 打开 `https://www.dola.com/`。
5. 确认右侧出现 `Seedance Inspector`。
6. 确认页面显示 `当前 Chrome 会话 · 无需重新登录` 和 `自动记录已开启`。
7. 正常进行 Google/Dola 登录或直接复用已有登录态。

G1 通过后进入 G2：正常生成一次 Seedance 2.5 / 10s / T2V，并验证请求/响应捕获。

### 测试记录模板

```text
Date:
Gate:
Environment:
Action:
Expected:
Observed:
PASS/FAIL:
Evidence:
Known limitations:
Next action:
```
