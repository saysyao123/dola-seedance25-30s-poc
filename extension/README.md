# Dola 页面内控制台

这是当前**最简单的测试入口**，不需要 Node.js、不需要命令行、不需要 localhost。

## 第一次只做 4 步

1. 在 GitHub 仓库点 `Code → Download ZIP`，解压。
2. Chrome 地址栏打开 `chrome://extensions/`。
3. 打开右上角「开发者模式」。
4. 点「加载已解压的扩展程序」，选择解压目录里的 `extension` 文件夹。

完成后打开：

`https://www.dola.com/`

Dola 页面右侧会自动出现 **Seedance 2.5 控制台**。

## 日常使用

1. 正常登录 Dola。
2. 右侧面板点「开始记录」。
3. 在 Dola 原页面正常生成 Seedance 2.5 视频。
4. 面板会显示捕获到的候选请求/响应数量，以及识别到的模型与 duration。
5. 需要把测试结果用于研究时，点「导出记录」。导出的 JSON 已按设计排除 Cookie/Authorization headers，并对常见 token/session/signature 字段做脱敏。

## 当前阶段

当前扩展**只观察，不修改 Dola 请求**。

先跑通：

- G1：扩展能在 Dola 页面正常工作；
- G2：能识别正常 Seedance 2.5 10 秒生成请求；
- G3：梳理任务提交/轮询/结果链路。

之后才进入 10s/30s 请求结构对比。

## 安全边界

- 不收集 Cookie header。
- 不收集 Authorization header。
- 不要求在扩展里输入账号密码。
- 登录仍然完全发生在 Dola 官方页面。
- 不自动注册账号、不处理验证码、不绕过账户权限或服务端访问控制。
