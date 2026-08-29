# Desktop D0 — Multi-account Session Shell

这是新的默认产品方向的第一个可运行版本。

## 当前能力

- Electron 44
- 添加多个 Dola 账号槽位
- 每账号独立 `persist:seedance-account-<uuid>` Chromium partition
- 每账号独立 Dola WebView
- 用户在可见页面里手动登录
- 切换账号不混用 Cookie
- 软件重启后 partition 保留登录态
- 可以人工清除某个账号在本软件里的本地登录态

## 当前还没有

- Seedance Prompt 提交器
- 10s baseline 自动识别
- 30s native adapter
- task queue
- result polling
- Windows 安装包

这些分别属于 D2–D6。

## 本地运行

需要 Node.js/npm，仅限开发阶段：

```powershell
cd desktop
npm install
npm start
```

Electron 版本固定为 `44.0.0`。

## D0 / D1 人工验收

1. 启动桌面程序。
2. 点击“添加账号”，创建 `Dola A`。
3. 在中间 Dola 页面手动登录账号 A。
4. 再创建 `Dola B`，确认 B 没有继承 A 的登录状态。
5. 手动登录 B。
6. 关闭程序并重新启动。
7. 切换 A/B，确认两个账号各自仍保持自己的登录状态。
8. 点击“清除本账号登录态”，只应退出当前账号 partition，不影响另一个账号。

满足 2–8 后才把 D1 标记为 PASS。

## 安全说明

- 不要在仓库提交 Electron userData 目录。
- `accounts.json` 只保存账号显示名、UUID、partition 等非敏感元数据。
- 不保存 Google 密码或 TOTP。
- 登录 Cookie 只存在本机 Chromium partition。

## 下一 Gate

D2：在 Account A 的 Dola WebView 中正常生成一次 Seedance 2.5 10s T2V，并由主进程以 observation-only 模式识别视频请求和 conversation 生命周期。
