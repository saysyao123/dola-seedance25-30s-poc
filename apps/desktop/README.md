# Seedance Desktop Studio v0.1

这是 clean-room 桌面版 POC 的第一阶段。

当前只验证一件事：

> 在一个 Electron 桌面程序中创建多个 Dola 账号，每个账号使用独立 persistent Chromium partition，并由用户在可见 Dola 页面中手动登录。

## 当前已实现

- Electron 桌面壳；
- 添加多个 Dola 账号；
- 每账号独立 `persist:dola_<id>` partition；
- 每账号一个长期存在的 Dola WebView；
- 账号切换；
- Chromium 自动保留 Cookie / Local Storage；
- 单独清除某个账号的本地会话；
- 不接收、不保存 Google 密码或 TOTP；
- 不实现指纹伪装；
- 不实现账号自动轮换；
- 不实现隐藏 Dola 30s 协议。

## Windows 测试

进入：

```text
apps/desktop
```

执行：

```powershell
npm install
npm start
```

程序启动后：

1. 点击“添加 Dola 账号”；
2. 为账号命名，例如 `Dola A`；
3. 在右侧真实 Dola 页面中自行使用 Google 登录；
4. 再添加 `Dola B`；
5. 用另一个账号登录；
6. 在 A/B 间切换，确认登录态互不影响；
7. 关闭并重新启动应用，确认两个账号仍保持各自登录态。

## G1 验收

```text
[ ] Desktop launches
[ ] Account A can log in manually
[ ] Account B can log in manually
[ ] A/B sessions do not leak into each other
[ ] Switching accounts does not require re-login
[ ] Restart keeps both Chromium sessions
[ ] Clear session only clears the selected account
```

## 下一阶段

G1 通过后才进入：

- Task Manager
- 官方 BytePlus ModelArk Seedance 2.5 Provider
- 4 秒 smoke test
- 原生 30 秒 T2V
- 原生 30 秒 I2V
- 结果下载
- Windows 打包

相关设计：`../../docs/DESKTOP_MULTI_ACCOUNT_PLAN.md`

## 5 秒 Dola 生产账本

当前生产测试固定为 `seedance-v2.5`、请求时长 5 秒。桌面端提供本地容量账本，
将生成成功与 clean 文件交付分开统计。统计按 `Asia/Shanghai` 00:00 换日，
但服务端额度仍以真实 provider evidence 为准。

只有服务端明确报告 `daily_complete` 时，轮询器才会进入下一个正常账号；遇到
地区、账号或速率限制会停止，不通过换号规避限制。详见：

- `../../docs/DOLA_D01_D02_PRODUCTION.md`
- `../../docs/DOLA_DAILY_CAPACITY_AND_ROTATION.md`
