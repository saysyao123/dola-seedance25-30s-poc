# Dola Seedance 2.5 30s Desktop POC

公开测试仓库，用于验证：在**用户本人合法登录且账户本身具有对应生成权益的会话**中，识别并验证 Seedance 2.5 原生 30 秒 T2V，并逐步形成一个可长期使用的 Windows 多账号桌面工作台。

## 2026-08-29 架构更新

通过对用户提供的“小柴多开器”Windows 安装包进行 clean-room 静态分析，确认其真正的产品架构是：

- Electron 桌面容器
- 每账号独立 persistent session partition
- 每账号独立 Dola WebView/WebContents
- 30 秒 Seedance 2.5 使用独立 desktop/native task lifecycle，而不是只修改网页 `duration`
- SSE acknowledgement → conversation id → conversation chain polling → media result

因此本项目的最终产品方向已经从“Chrome Extension 优先”调整为：

```text
Electron Desktop
↓
Account Manager
↓
每账号独立 Dola persistent session
↓
用户首次手动登录
↓
Seedance Task Manager
↓
10s baseline / 30s capability POC
↓
SSE / conversation-chain / result
↓
Queue / History / Download
```

详细分析：

- `docs/XIAOCHAI_STATIC_ANALYSIS.md`
- `docs/MULTI_ACCOUNT_DESKTOP_ARCHITECTURE.md`

## 当前阶段

**Phase D0 — Desktop Shell / Multi-account Foundation**

第一目标仍然不是批量跑任务，而是：

> 用一个真实账号跑通 Electron 持久登录 → 10s baseline → 30s capability → result lifecycle；确认后再扩展到多账号队列。

## Desktop Gate

- [ ] D0：Electron 主窗口 + Account Manager + persistent partitions
- [ ] D1：Account A 手动登录后重启仍保持登录；Account B 完全隔离
- [ ] D2：捕获 Seedance 2.5 10s T2V baseline
- [ ] D3：在账户本身允许时验证 30s T2V；权限/额度拒绝则记录并停止
- [ ] D4：SSE / conversation chain / result 生命周期跑通
- [ ] D5：多账号任务队列（用户明确选择账号，每账号默认串行）
- [ ] D6：Windows x64 打包，普通用户双击使用

只有真实 evidence 才能标记 Gate PASS。

## 账号方案

每个账号使用独立 Chromium persistent partition：

```text
Account A -> persist:seedance-account-a
Account B -> persist:seedance-account-b
Account C -> persist:seedance-account-c
```

用户在可见 Dola 页面中手动登录一次，软件不保存 Google 密码/TOTP Secret。

## 原 Chrome Extension

`extension/` 不删除，继续保留为：

- 协议观察器
- 请求/响应脱敏工具
- Debug fallback

但它不再是最终多账号产品架构。

## 明确不做

- 自动/批量注册账号
- CAPTCHA / MFA / 人机验证绕过
- Google 密码或 TOTP 自动托管
- 指纹伪造规避风控
- 自动轮换账户规避额度、速率或付费限制
- 伪造账户 entitlement
- 上传 Cookie、Token、Session、原始 HAR、浏览器 Profile

## Provider 方向

长期建议保留两条 Provider：

1. **Dola Web Provider**：多账号 Session、网页能力、任务观察与结果管理；
2. **BytePlus Seedance Provider**：未来作为官方 Seedance 2.5 API 稳定生产线路。

## 参考

- ByteDance Seedance 2.5 官方能力：单次最高 30 秒
- `chuansd/doubao-international`
- `Lolita-cybe/doubao-dola-watermark-helper`（目标软件第三方 notices 中声明 MIT 来源）
- `T8mars/ComfyUI_Seedance`
- 用户提供的“小柴多开器”样本 clean-room 静态分析

## 当前状态

**项目已正式进入 Electron 多账号桌面版路线。下一步：D0，先完成可以添加账号、打开独立 Dola 会话并持久化登录态的最小桌面壳。**
