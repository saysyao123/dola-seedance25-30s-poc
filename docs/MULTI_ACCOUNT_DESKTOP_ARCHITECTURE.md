# 多账号 Seedance Desktop Studio 架构

## 目标

把当前 POC 升级为一个用户可以长期操作的 Windows 桌面工具：

- 多个用户本人拥有的 Dola 账号
- 每账号独立持久登录态
- 可见的 Dola 页面，不隐藏真实操作
- Seedance 视频任务工作台
- Prompt / 时长 / 比例 /任务状态统一管理
- 任务完成后统一收集结果
- 未来可并列接入官方 BytePlus Seedance API

## 产品原则

1. 不保存 Google 密码与 TOTP Secret。
2. 不自动注册账户。
3. 不自动处理 CAPTCHA / MFA。
4. 不伪造设备身份来绕过服务端控制。
5. 不为了规避额度或付费限制自动轮换账户。
6. 用户第一次在每个账号 WebView 中手动登录，之后只持久化 Chromium session partition。
7. 如果 Dola 返回 quota / entitlement / permission denied，任务失败并记录，不尝试绕过。

## 总体架构

```text
Electron Main
│
├── AccountManager
│   ├── Account A -> persist:seedance-account-a
│   ├── Account B -> persist:seedance-account-b
│   └── Account C -> persist:seedance-account-c
│
├── WebViewManager
│   ├── Dola WebContents A
│   ├── Dola WebContents B
│   └── Dola WebContents C
│
├── DolaObserver
│   └── CDP Network / Fetch (observation-first)
│
├── SeedanceTaskManager
│   ├── queued
│   ├── submitting
│   ├── accepted
│   ├── generating
│   ├── success
│   └── failed
│
├── ResultResolver
│   └── conversation/task chain -> returned media URL
│
├── DownloadManager
│   └── local outputs/
│
└── Provider adapters
    ├── DolaWebProvider
    └── BytePlusSeedanceProvider (future / official)
```

## 1. AccountManager

### Account data stored in app config

只保存非敏感元数据：

```ts
type AccountRecord = {
  id: string;
  name: string;
  provider: 'dola';
  partition: string;
  enabled: boolean;
  proxyMode: 'system' | 'direct' | 'account';
  proxyUrl?: string;
  lastSeenAt?: number;
  loginState: 'unknown' | 'logged-in' | 'logged-out';
};
```

不要在 `accounts.json` 保存：

- Google password
- TOTP secret
- Dola Cookie header
- access token
- refresh token

### Session

每个账号创建：

`persist:seedance-account-<uuid>`

用户在对应 WebView 首次手动登录 Dola 后，该 partition 自己保存 Chromium 登录状态。

## 2. UI

建议左侧账号栏 + 中间 Dola + 右侧任务栏。

```text
┌──────────────┬────────────────────────────────┬─────────────────────┐
│ Accounts     │ Dola                           │ Seedance Studio     │
│              │                                │                     │
│ ● Account A  │ 官方 Dola 页面                │ Model: Seedance 2.5 │
│ ● Account B  │                                │ Duration: 10 / 30   │
│ ○ Account C  │                                │ Ratio: 9:16         │
│              │                                │ Prompt              │
│ + Add        │                                │ [.................] │
│              │                                │ [Create task]       │
│              │                                │                     │
│              │                                │ Queue / Result      │
└──────────────┴────────────────────────────────┴─────────────────────┘
```

第一版不追求漂亮 UI，先保证账号状态与任务状态绝不混淆。

## 3. DolaWebProvider

### Baseline

先只观察用户在官方 Dola UI 中正常进行的一次 Seedance 2.5 T2V 请求。

Provider 需要输出标准化事件：

```ts
type GenerationObservation = {
  accountId: string;
  model?: string;
  duration?: number;
  ratio?: string;
  mode?: 't2v' | 'i2v' | 'multi' | 'unknown';
  conversationId?: string;
  state: string;
};
```

### 30 秒 Gate

小柴静态分析表明其 30 秒实现并非普通 duration patch，而是独立 desktop/native request envelope + SSE + conversation chain。

我们的代码设计必须把这部分封装为：

```ts
interface DolaThirtySecondAdapter {
  canAttempt(ctx: AccountRuntimeContext): Promise<CapabilityCheck>;
  submit(request: NormalizedVideoRequest): Promise<SubmissionResult>;
}
```

约束：

- 默认 `experimental`；
- 必须基于当前账号真实登录 session；
- 不生成或伪造反滥用/安全签名；
- 不制造虚假 entitlement；
- 服务端明确拒绝则立即返回失败。

真正请求结构只在本地实验中从用户自己的合法请求中验证，不把 Cookie/Token/安全签名提交到公开 GitHub。

## 4. TaskManager

```ts
type VideoTask = {
  id: string;
  accountId: string;
  provider: 'dola' | 'byteplus';
  mode: 't2v' | 'i2v' | 'multi';
  model: string;
  duration: number;
  ratio: string;
  prompt: string;
  state: 'queued' | 'submitting' | 'accepted' | 'generating' | 'success' | 'failed';
  conversationId?: string;
  resultUrl?: string;
  outputPath?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
};
```

### 调度规则

默认：

- 每账号最多同时 1 个 generation task；
- 全局并发默认 1；
- 用户可以人工提高并发，但必须遵守平台正常限制；
- 不根据剩余额度自动切换到另一个账号来规避限额。

## 5. Submit / Poll / Result

通过小柴静态分析，目前最值得复用的任务生命周期抽象为：

```text
User request
↓
submit
↓
SSE acknowledgement
↓
conversation id
↓
conversation chain poll
↓
terminal media
↓
download
```

Dola poll 建议初始间隔 5 秒。

不要高频轮询。

## 6. Provider abstraction

长期不要把全部代码写死在 Dola。

```ts
interface VideoProvider {
  id: string;
  listCapabilities(accountId: string): Promise<ProviderCapabilities>;
  submit(task: VideoTask): Promise<SubmissionResult>;
  poll(task: VideoTask): Promise<PollResult>;
  download(task: VideoTask): Promise<DownloadResult>;
}
```

这样未来可以增加：

- Dola Web
- BytePlus ModelArk
- 其他用户自己合法配置的 Seedance API Provider

## 7. 安全存储

公开仓库必须忽略：

```text
user-data/
profiles/
accounts.local.json
secrets.json
captures/raw/
outputs/
*.har
*.log
```

如果未来官方 API 需要 key：

- Windows Credential Manager / Electron safeStorage；或
- `.env.local`（仅开发期）。

## 8. MVP Gate

### D0 — Desktop shell

- Electron 启动
- Account Manager UI
- 新建账号
- 每账号 persistent partition

### D1 — Manual login

- 打开 Account A
- 用户自行登录 Dola
- 重启程序
- Account A 仍保持登录
- Account B 不共享 A 的 Cookie

### D2 — Video observation

- Account A 正常通过 Dola UI 发一次 Seedance 2.5 10s T2V
- 捕获并标准化 model / duration / ratio / conversation

### D3 — 30s capability POC

- 只对账户本身允许的 Seedance 2.5 30s T2V 做一次实验提交
- 成功则记录 SSE / conversation
- permission/quota/entitlement 拒绝则失败并停止

### D4 — Result lifecycle

- 自动 poll
- 识别终态
- 获得平台返回的媒体结果
- 保存本地历史

### D5 — Queue

- UI 中可以将 Prompt 添加到队列
- 用户明确选择目标账号
- 每账号串行执行

### D6 — Windows build

- 打成一个安装包/portable exe
- 用户不需要安装 Node.js

## 9. 第一版明确不做

- 自动账号注册
- 批量账号密码导入
- Google 密码自动输入
- TOTP 自动输入
- CAPTCHA/MFA 绕过
- 指纹伪装
- 自动轮换账户逃避额度
- 把 Dola session/token 上传到任何服务器

## 10. 当前推荐开发顺序

不要先做“20个账号批量生成”。

正确顺序：

`1-account Electron shell`
→ `persistent login`
→ `10s baseline`
→ `30s POC`
→ `poll/result`
→ `2-account isolation`
→ `task queue`
→ `N-account UI`

只要 D3 在一个真实账号上通过，后面的多账号基本都是普通 Electron 工程问题。
