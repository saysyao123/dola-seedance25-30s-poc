# Architecture

## POC 总体架构

```text
User-visible Chrome / Chromium
        │
        │ user logs into Dola manually
        ▼
Playwright / CDP Observer
        │
        ├── request metadata capture
        ├── response metadata capture
        ├── candidate video request detection
        └── automatic redaction
        │
        ▼
Local raw capture (gitignored)
        │
        ▼
Sanitizer
        │
        ▼
Sanitized fixtures (safe to review)
        │
        ├── request classifier
        ├── lifecycle mapper
        └── 10s vs 30s structured diff
        │
        ▼
Validated Dola request model
        │
        ▼
Optional submit/poll/result adapters
```

## 设计原则

### 1. Browser first
第一阶段不伪造登录，不要求粘贴 Cookie。优先由用户自己在真实浏览器中完成登录，观察页面自己产生的网络行为。

### 2. Observe before replay
先捕获和理解真实请求，再决定是否需要代码重放。未知请求不得直接批量重放。

### 3. Raw data stays local
`captures/raw/`、浏览器 Profile、真实 HAR 永远不提交。

### 4. Sanitized evidence
仓库中如果保留样本，只保留已经删除 Cookie、Authorization、用户 ID、设备 ID、会话 ID、签名等信息的最小结构。

### 5. Evidence levels
每个协议字段标注：

- `observed`：真实请求中出现
- `inferred`：根据差异推断
- `verified`：已通过实际任务验证

## 模块

### `src/browser`
负责启动/连接浏览器、监听页面请求和响应。

### `src/security`
负责脱敏、敏感字段检测和提交前检查。

### `src/dola`
后续放置 Dola 请求分类、任务生命周期和结果解析。

### `src/diff`
后续负责 10s/30s 样本规范化与差异分析。

## 第一版数据策略

默认只保存：

- HTTP method
- URL 的 origin/path（query 默认脱敏）
- status
- content-type
- request body 的脱敏 JSON（仅候选请求）
- 时间戳

默认不保存：

- Cookie
- Authorization
- 完整 request headers
- 浏览器 localStorage
- sessionStorage
- 原始 response body（除非后续明确允许且经过脱敏）

## POC 完成后再考虑

- submit adapter
- polling adapter
- result downloader
- task history
- multi-account UI
- desktop packaging
