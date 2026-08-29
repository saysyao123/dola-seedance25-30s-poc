# Seedance Desktop Studio｜多账号桌面版实施方案

## 1. 产品目标

做一个用户自己可以长期使用的 Windows 小软件，借鉴“小柴多开器”的多账号 UX，但采用 clean-room 自研架构。

第一阶段目标：

```text
桌面程序
├── 多账号 Dola WebView
├── 每账号独立登录态
├── 任务工作台
├── Provider 选择
│   ├── Dola Web
│   └── BytePlus Seedance 2.5 API
├── 10s / 30s 等时长设置
├── Prompt
├── 任务状态
└── 视频结果 / 下载
```

## 2. 为什么改成 Electron

Chrome Extension 适合单账号协议观察，但不适合真正的多账号产品。

Electron 的关键优势：

- 可以为每个账号使用独立 persistent partition；
- 多个 Dola 会话可以同时存在；
- WebView 可以保持挂载；
- 可建立统一任务工作台；
- 可安全访问本地下载目录；
- 可把 Provider/API 与 WebView 账号管理放在同一 UI；
- 更适合后续打包为一个 Windows EXE。

## 3. 安全边界

必须遵守：

- 不自动注册账号；
- 不绕过 CAPTCHA；
- 不存储 Google 密码；
- 不存储 TOTP Secret；
- 不伪造 entitlement；
- 不绕过服务端权限；
- 不进行账号轮换刷额度；
- 不实现反检测型指纹伪装；
- 不把 Cookie/API Key 写入 Git；
- 服务端明确返回 quota / permission / unsupported 时停止该任务。

## 4. 推荐目录

```text
apps/desktop/
├── package.json
├── src/
│   ├── main/
│   │   ├── main.ts
│   │   ├── window-manager.ts
│   │   ├── account-manager.ts
│   │   ├── session-manager.ts
│   │   ├── task-manager.ts
│   │   ├── download-manager.ts
│   │   └── secret-store.ts
│   ├── providers/
│   │   ├── provider.ts
│   │   ├── dola-web.ts
│   │   └── byteplus-seedance25.ts
│   ├── shared/
│   │   ├── types.ts
│   │   └── validation.ts
│   └── renderer/
│       ├── index.html
│       ├── app.ts
│       └── styles.css
└── tests/
```

## 5. Account Manager

账号只保存非敏感元数据：

```ts
type ManagedAccount = {
  id: string;
  name: string;
  provider: 'dola';
  partition: string;
  loginStatus: 'unknown' | 'logged_in' | 'logged_out';
  createdAt: number;
};
```

创建账号时：

```text
Account A
-> partition = persist:dola_<UUID>
-> https://www.dola.com/chat/
```

用户在该 WebView 中自己完成 Google / Dola 登录。

登录凭据永远不经过我们的 renderer 表单。

## 6. Session Manager

职责：

- 创建 persistent partition；
- 打开 Dola WebView；
- 保存 Chromium 自身登录状态；
- 删除账号时可选择同时删除该 partition；
- 检测基本登录状态；
- 不导出 Cookie 到普通 JSON。

## 7. Provider 抽象

统一接口：

```ts
interface VideoProvider {
  id: string;
  capabilities(): Promise<ProviderCapabilities>;
  createTask(input: VideoTaskInput): Promise<CreatedTask>;
  getTask(taskId: string): Promise<VideoTaskState>;
  cancelTask?(taskId: string): Promise<void>;
}
```

### Provider A：Dola Web

首版只负责：

- 多账号页面容器；
- 用户手动选择账号；
- 页面任务观察；
- 结果识别；
- 下载辅助；
- capability 以页面/服务端真实返回为准。

不实现隐藏客户端身份模拟。

### Provider B：BytePlus Seedance 2.5

使用官方 API。

目标模型：

`dreamina-seedance-2-5-260628`

已确认能力：

- T2V
- I2V 首帧
- I2V 首尾帧
- 多模态 Reference
- 4–30 秒
- 异步任务
- task ID
- task polling
- video_url result

## 8. Task Manager

状态机：

```text
DRAFT
  ↓
SUBMITTING
  ↓
QUEUED
  ↓
RUNNING
  ↓
SUCCEEDED
  └──> DOWNLOAD_READY

FAILED / CANCELLED / EXPIRED
```

每个 Task 保存：

```ts
type VideoTask = {
  id: string;
  provider: string;
  accountId?: string;
  prompt: string;
  mode: 't2v' | 'i2v' | 'multi';
  duration: number;
  ratio: string;
  resolution: string;
  status: string;
  remoteTaskId?: string;
  resultUrl?: string;
  outputPath?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
};
```

## 9. 多账号任务规则

允许：

- 用户手动选择任务使用哪个自己的账号；
- 每个账号显示当前任务数；
- 每个账号独立运行自己的正常任务；
- 每个账号显示真实 quota / permission 错误；
- 用户自己决定下一任务使用哪个账号。

禁止：

- 自动检测某账号额度耗尽后切换另一个账号继续刷；
- 自动注册新账号；
- 自动批量登录 Google 密码/TOTP；
- 用代理/指纹模拟绕过平台限制。

## 10. UI 草图

```text
┌────────────────────────────────────────────────────────────┐
│ Seedance Desktop Studio                                   │
├──────────────┬─────────────────────────────────────────────┤
│ Accounts     │ Video Task                                  │
│              │                                             │
│ ● Dola A     │ Provider   [BytePlus Seedance 2.5 ▼]       │
│ ● Dola B     │ Mode       [Text to Video ▼]               │
│ ○ Dola C     │ Duration   [10s] [15s] [30s]               │
│              │ Ratio      [9:16 ▼]                         │
│ [+ Add]      │ Resolution [480p ▼]                         │
│              │                                             │
│              │ Prompt                                      │
│              │ ┌─────────────────────────────────────────┐ │
│              │ │                                         │ │
│              │ └─────────────────────────────────────────┘ │
│              │                                             │
│              │ [Generate]                                  │
├──────────────┼─────────────────────────────────────────────┤
│ Dola WebView │ Queue / Running / Finished                  │
│              │ #14 Running  42%                            │
│              │ #13 Done     [Open] [Download]              │
└──────────────┴─────────────────────────────────────────────┘
```

## 11. 开发 Gate

### G0 — Desktop Shell

- Electron 正常启动；
- Windows 可运行；
- 不影响现有 extension POC。

### G1 — Multi-account Sessions

- 添加 2 个 Dola 账号；
- 两个账号拥有不同 persistent partition；
- 用户可在两个 WebView 中分别手动登录；
- 切换后登录态不串号。

### G2 — Account Persistence

- 重启程序后账号列表恢复；
- Chromium 登录态恢复；
- 不保存用户密码。

### G3 — BytePlus Provider

- API Key 仅保存在本地 Secret Store；
- 创建 4 秒测试任务；
- 成功轮询到 result；
- 下载 MP4。

### G4 — Native 30s Official Test

- Seedance 2.5 T2V；
- duration = 30；
- 480p；
- 成功取得单段 30 秒视频。

### G5 — I2V 30s

- 首帧图片；
- 30 秒；
- 成功取得单段 I2V 视频。

### G6 — Unified Queue

- Dola Web 任务与 BytePlus API 任务统一显示；
- 每任务独立状态；
- 下载与历史正常。

## 12. Codex 实施顺序

Codex 不要从“复刻小柴的隐藏协议”开始。

正确顺序：

```text
Electron shell
→ account partitions
→ manual Dola login
→ session persistence
→ task database
→ official BytePlus Seedance 2.5 provider
→ 4s smoke test
→ 30s T2V
→ 30s I2V
→ unified queue
→ Windows packaging
```

只有经过实际服务器响应验证的功能才能标记 PASS。
