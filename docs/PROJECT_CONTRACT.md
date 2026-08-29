# Project Contract — Dola Seedance 2.5 30s POC

## 原始目标

验证一条可复用的本地技术路径：使用用户本人**当前 Chrome 中已经正常登录**、且本身拥有相应生成权限的 Dola 账户，识别并调用 Seedance 2.5 视频生成链路，重点验证原生 30 秒 T2V。

## 本次交付

第一阶段只交付：

1. 可审计的仓库结构与安全规则。
2. 当前 Chrome + Manifest V3 Extension 的会话内观察方案。
3. Dola 页面右侧 Seedance Inspector。
4. Dola 视频请求/响应捕获与脱敏工具。
5. 任务提交/轮询/结果链路分析文档。
6. 10 秒与 30 秒请求结构化 Diff。
7. 在账户本身允许的情况下，完成一次 30 秒 T2V POC。
8. 取得最终视频并留下可复现测试记录。

## 明确不做

- 自动注册/批量注册账号。
- 验证码或反机器人机制绕过。
- 绕过服务端额度、权限或付费控制。
- 未经批准的账号池、代理池、大规模并发。
- 在核心链路未验证前制作完整产品 GUI。

## 锁定默认用户路径

```text
用户当前 Chrome
→ 保留现有 Google / Dola 登录态
→ 加载 extension/
→ 打开 Dola 官方页面
→ 页面右侧自动出现 Seedance Inspector
→ 直接在 Dola 原页面操作
```

Playwright / localhost / 独立 browser profile 只属于 Debug fallback，不是默认测试路径。

## 锁定规则

- 真实凭据只存在用户本机。
- 公开仓库只允许脱敏样本。
- 观察到的字段与推断字段必须分开记录。
- 所有“成功”必须有可验证证据：状态、任务链或最终媒体。
- 先最小 POC，后工程化。
- 不要求用户把 Cookie/Token/账号密码复制给 Agent。
- 不得为了测试而默认启动新的 Chrome 或要求重新登录 Google。

## 验收标准

### G1 — Current Chrome Extension
在用户平时正在使用的 Chrome 中加载 `extension/` 后，打开 Dola 官方页面即可看到右侧 Seedance Inspector；现有 Google / Dola 登录状态不被替换，不启动额外浏览器。

### G2 — Capture + Redaction
能够捕获与 Dola 视频生成相关的 fetch/XHR 请求与可安全读取的文本/JSON响应，并生成脱敏样本；不采集 Cookie/Authorization headers。

### G3 — Lifecycle Mapping
明确任务创建、任务标识、状态轮询、完成态与结果 URL 的关系。

### G4 — Request Diff
至少有两个可比较样本，自动区分稳定字段、动态字段与 10s/30s 有意义差异。

### G5 — 30s Submit
仅在账号自身具有该能力时，成功创建 30 秒 Seedance 2.5 T2V 任务。

### G6 — Result
成功识别完成态并取得最终 MP4；记录实际时长、分辨率与测试日期。

## 当前假设

1. Dola 的消费者网页 UI 与其实际视频服务能力并不完全等价。
2. Seedance 2.5 的 30 秒链路可能依赖与 10 秒不同的请求字段、模式或 feature flag，而不一定只是 `duration=30`。
3. 某些必要的浏览器环境参数可能由页面自身生成，因此第一版优先在真实 Dola 页面上下文中观察，而不是纯 `requests`/`fetch` 模拟。
4. 目前优先验证 T2V；I2V 30 秒不作为第一阶段验收条件。

这些假设只有经过真实样本验证后才能升级为事实。
