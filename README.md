# Dola Seedance 2.5 30s POC

公开测试仓库，用于验证：在**本人合法登录且本身具有对应生成权益的 Dola 账户**下，通过本地浏览器会话识别并复现 Seedance 2.5 视频生成链路，重点验证原生 30 秒 T2V 能力。

## 当前阶段

**Phase P0 — 最小可行验证（POC）**

本阶段只回答一个问题：

> 能否在不自动注册、不绕过验证码、不绕过账户权限或平台访问控制的前提下，复用本地已登录 Dola 会话，识别 10s/30s Seedance 2.5 请求差异，提交账户本身允许的 30 秒 T2V 任务，并取得最终视频？

## 第一阶段验收 Gate

- [x] G0：仓库骨架与安全规则建立
- [ ] G1：能够连接/观察本地已登录 Dola 浏览器会话
- [ ] G2：能够记录并脱敏保存 Seedance 2.5 视频生成相关网络请求
- [ ] G3：能够识别任务提交、轮询、结果解析链路
- [ ] G4：获得可比较的 10s 与 30s 请求样本，完成结构化 Diff
- [ ] G5：在账户本身允许的前提下成功提交一次 30s T2V
- [ ] G6：成功取得并保存最终 MP4，记录验证结果

只有 G0–G6 全部通过，才进入正式管理工具阶段。

## 暂不做

- 自动注册/批量注册 Dola 账号
- 验证码绕过、人机验证绕过
- 绕过账户权限、额度或服务端访问控制
- 代理池、账号池、批量并发
- 正式 GUI / Electron / Tauri 客户端
- 将 Cookie、Token、Session、原始 HAR、浏览器 Profile 上传 GitHub

## 技术方向

优先采用：

- Chrome / Chromium
- Playwright 或 Chrome DevTools Protocol (CDP)
- TypeScript / Node.js
- 本地浏览器 Profile 复用登录态
- 网络请求记录 + 自动脱敏
- 结构化 Request Diff

## 参考项目

研究阶段重点参考：

- `chuansd/doubao-international`：Dola 视频请求、duration 修改、VID/CDN/无水印结果解析
- `diegosouzapw/OmniRoute`：Dola Web Cookie Provider / Web Session 认证思路
- `WeiJunn/doubaoAssistant`：Cookie、本地账号状态与素材解析管理

这些项目只作为研究参考；本仓库的 POC 以可审计、最小权限和当前真实请求为准。

## 安全说明

这是公开仓库。任何真实凭据和原始抓包都必须仅保存在本地，被 `.gitignore` 排除。提交前必须完成脱敏检查。

详见：

- `docs/PROJECT_CONTRACT.md`
- `docs/ARCHITECTURE.md`
- `docs/REQUEST_ANALYSIS.md`
- `docs/TEST_LOG.md`
- `AGENTS.md`

## 当前状态

**G0 已完成。下一步：G1，本地浏览器连接与网络观察。**
