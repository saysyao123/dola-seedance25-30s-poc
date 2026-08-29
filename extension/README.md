# Dola Seedance Inspector｜当前 Chrome 直接使用

这是本项目的**唯一默认入口**。

不需要 Node.js，不需要 localhost，不需要 Playwright，不会启动新的 Chrome，也不会创建新的 browser profile。

它直接运行在你当前正在使用的 Chrome 中，因此会继续使用你当前 Chrome 里已有的 Google / Dola 登录状态。

## 第一次安装

1. 在 GitHub 仓库点 `Code → Download ZIP`，解压。
2. 在你平时正在使用、已经登录 Google 的 Chrome 地址栏打开：`chrome://extensions/`。
3. 打开右上角「开发者模式」。
4. 点击「加载已解压的扩展程序」。
5. 选择仓库中的 `extension` 文件夹。
6. 保持这个 Chrome，不要打开额外浏览器。
7. 直接打开 `https://www.dola.com/`。

## 安装成功后应该看到什么

Dola 页面右侧会自动出现 **Seedance Inspector**。

面板会明确显示：

- `当前 Chrome 会话 · 无需重新登录`
- `自动记录已开启`
- 请求数量
- 响应数量
- 最近一次候选请求
- 最近一次 HTTP 响应
- 导出脱敏记录

第一次安装后默认自动开始观察，不需要先点“开始记录”。

## 实际测试

1. 继续使用当前 Chrome 中已有的 Google/Dola 登录状态。
2. 在 Dola 官方页面正常进入视频生成功能。
3. 正常选择 Seedance 2.5。
4. 先生成一条 10 秒文生视频。
5. 观察右侧 Inspector 的请求/响应数量是否增加。
6. 如果识别成功，面板会尝试显示 Seedance 模型和 duration。
7. 如需研究请求结构，点击「导出脱敏记录」。

## 当前技术实现

Manifest V3 使用两个 execution world：

- `page-hook.js`：直接以 `MAIN` world 在 Dola 页面上下文中运行，从 `document_start` 开始观察 `fetch` / `XMLHttpRequest`。
- `content.js`：运行扩展自己的 UI 和本地存储逻辑，把右侧 Inspector 注入 Dola 页面。

这样不再通过页面 `<script>` 标签注入 hook，避免受到页面 CSP 对扩展脚本注入的影响。

## 当前阶段

当前扩展只做观察和脱敏记录，不修改 Dola 请求。

顺序仍然是：

- G1：当前 Chrome 中扩展正常出现；
- G2：捕获正常 Seedance 2.5 10 秒请求/响应；
- G3：识别 submit / polling / result 链；
- G4：再做 10s / 30s 请求差异分析。

## 安全边界

- 不读取或保存 Cookie header。
- 不读取或保存 Authorization header。
- 不要求在扩展里输入 Google/Dola 密码。
- 常见 token/session/signature/fingerprint 字段会脱敏。
- 登录完全发生在 Dola 官方页面。
- 不自动注册账号。
- 不绕过验证码。
- 不绕过额度、账户权限或服务端访问控制。

## 如果右侧面板没有出现

1. 打开 `chrome://extensions/`。
2. 找到 `Dola Seedance Inspector`。
3. 确认扩展已启用。
4. 点击「刷新」扩展。
5. 回到 Dola 页面后按 `Ctrl+R` 刷新。
6. 如仍失败，在扩展详情页查看 Errors，并把错误文本用于调试。
