# Dola Seedance 2.5 30s POC

公开测试仓库，用于验证：在**本人合法登录且本身具有对应生成权益的 Dola 账户**下，通过本地浏览器会话识别并验证 Seedance 2.5 视频生成链路，重点测试原生 30 秒 T2V 能力。

## 最简单的测试方式（Windows）

目标是尽量不让测试者碰命令行。

1. 下载/克隆本仓库到本机。
2. 双击根目录的 `START_WEB.bat`。
3. 首次运行会自动执行 `npm install`。
4. 默认浏览器会自动打开本地控制台：`http://127.0.0.1:3210`。
5. 点击 **“打开 Dola 登录 / 测试”**。
6. 会弹出一个由本机 Chrome 承载的 Dola 窗口；只在这个窗口里正常登录 Dola。
7. 先正常生成一条 Seedance 2.5 的 10 秒文生视频，作为 G1/G2 基线样本。

本地控制台不会要求输入 Cookie、Token 或密码。Dola 登录发生在真实 Dola 页面中；浏览器 Profile、原始抓取和生成视频均默认被 `.gitignore` 排除，不进入公开仓库。

> 前置条件：Windows 已安装 Node.js 20+ 和 Google Chrome。

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

## 已实现的操作入口

- `START_WEB.bat`：Windows 一键启动本地网页控制台（推荐）
- `npm run web`：手动启动本地网页控制台
- `npm run observe`：旧的命令行观察器入口，保留用于调试

## 暂不做

- 自动注册/批量注册 Dola 账号
- 验证码绕过、人机验证绕过
- 绕过账户权限、额度或服务端访问控制
- 代理池、账号池、批量并发
- 将 Cookie、Token、Session、原始 HAR、浏览器 Profile 上传 GitHub

## 技术方向

- 本机 Chrome + Playwright / CDP
- TypeScript / Node.js
- 本地持久化浏览器 Profile
- 网络请求记录 + 自动脱敏
- 结构化 Request Diff
- 本地 Web Dashboard 降低测试门槛

## 参考项目

- `chuansd/doubao-international`：Dola 视频请求、VID/CDN/结果解析
- `diegosouzapw/OmniRoute`：Dola Web Session 认证思路
- `WeiJunn/doubaoAssistant`：本地账号状态与素材解析管理

## 安全说明

这是公开仓库。真实凭据和原始抓包必须仅保存在本地，被 `.gitignore` 排除。提交前必须完成脱敏检查。

详见：

- `docs/PROJECT_CONTRACT.md`
- `docs/ARCHITECTURE.md`
- `docs/REQUEST_ANALYSIS.md`
- `docs/TEST_LOG.md`
- `docs/WINDOWS_G1_RUNBOOK.md`
- `AGENTS.md`

## 当前状态

**G0 已完成；本地 Web Dashboard 已实现。下一步：通过网页入口完成 G1/G2 实测。**
