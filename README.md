# Dola Seedance 2.5 30s POC

公开测试仓库，用于验证：在**本人合法登录且账户本身具有对应生成权益的 Dola 会话**中，识别并验证 Seedance 2.5 视频生成链路，重点研究原生 30 秒 T2V。

## 默认使用方式：当前 Chrome + 页面内 Inspector

本项目已经正式取消“新开 Playwright 浏览器 / localhost 控制台”作为默认路径。

现在的唯一默认用户路径是：

```text
你平时正在使用的 Chrome
↓
保留当前 Google / Dola 登录状态
↓
安装 extension/ Chrome Extension
↓
打开 Dola 官方页面
↓
右侧自动出现 Seedance Inspector
↓
直接在 Dola 原页面正常生成视频
```

不需要 Node.js，不需要命令行，不需要新的 Chrome Profile。

### 第一次安装只做 5 步

1. 下载/克隆本仓库。
2. 用你当前正在使用的 Chrome 打开 `chrome://extensions/`。
3. 开启「开发者模式」。
4. 点击「加载已解压的扩展程序」。
5. 选择仓库里的 `extension` 文件夹。

然后直接打开：

`https://www.dola.com/`

右侧会自动出现 **Seedance Inspector**，并默认开启候选请求观察。

完整安装说明见：`extension/README.md`。

## 当前阶段

**Phase P0 — Protocol Discovery / POC**

当前只回答一个问题：

> 能否在不自动注册、不绕过验证码、不绕过账户权限或服务端访问控制的前提下，直接复用用户当前 Chrome 中的真实 Dola 登录会话，识别 10s/30s Seedance 2.5 请求差异，验证账户本身允许的 30 秒 T2V，并取得最终视频？

## 第一阶段验收 Gate

- [x] G0：仓库骨架与安全规则建立
- [ ] G1：扩展在用户当前 Chrome 的 Dola 页面正常出现
- [ ] G2：扩展捕获并脱敏保存 Seedance 2.5 10 秒请求/响应
- [ ] G3：识别 submit / polling / result 链
- [ ] G4：获得可信 10s / 30s 样本并完成结构化 Diff
- [ ] G5：在账户本身允许的前提下成功提交一次 30s T2V
- [ ] G6：成功取得并保存最终 MP4，记录验证结果

只有真实 evidence 才能把 Gate 标记为 PASS。

## 默认入口

- `extension/`：**唯一默认入口**，直接运行在当前 Chrome / 当前登录态中。

## Debug fallback

下面这些仅供开发调试，不是普通测试者入口：

- `npm run debug:observe`
- `npm run debug:web`
- `DEBUG_START_WEB.bat`

Debug fallback 可能启动独立 Playwright Chrome，仅用于定位扩展无法覆盖的问题。

## 暂不做

- 自动注册/批量注册 Dola 账号
- 验证码或人机验证绕过
- 绕过账户权限、额度或服务端访问控制
- 代理池、账号池、批量并发
- 上传 Cookie、Token、原始 HAR、浏览器 Profile

## 技术方向

### 默认

- Chrome Extension Manifest V3
- `MAIN` world page hook
- Dola 页面内 Inspector
- 当前 Chrome 已有 Google / Dola 登录状态
- `fetch` / `XMLHttpRequest` 观察
- 请求/响应自动脱敏
- 结构化 Request Diff

### Debug only

- Node.js 20+
- TypeScript
- Playwright / CDP

## 参考项目

- `chuansd/doubao-international`：Dola 视频请求、duration、VID/CDN/结果解析
- `diegosouzapw/OmniRoute`：Dola Web Session / Cookie Provider 思路
- `WeiJunn/doubaoAssistant`：Dola 素材解析与本地状态管理

## 安全说明

这是公开仓库。真实凭据和原始抓包必须只留在本地。扩展不采集 Cookie/Authorization headers，并对常见 token/session/signature/fingerprint 字段做脱敏。

详见：

- `extension/README.md`
- `AGENTS.md`
- `docs/PROJECT_CONTRACT.md`
- `docs/ARCHITECTURE.md`
- `docs/REQUEST_ANALYSIS.md`
- `docs/TEST_LOG.md`

## 当前状态

**默认架构已经切换为：当前 Chrome + Chrome Extension + Dola 页面内 Inspector。下一人工 Gate：G1 当前浏览器实测。**
