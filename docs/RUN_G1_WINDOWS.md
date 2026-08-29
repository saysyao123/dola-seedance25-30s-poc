# G1 Windows Runbook

目标：只验证本地 Chrome 会话能否被观察器启动，并在用户手动登录 Dola 后记录候选视频请求元数据。

## 前置条件

- Windows
- Node.js 20+
- 已安装 Google Chrome
- Git

## 运行

```powershell
git clone https://github.com/saysyao123/dola-seedance25-30s-poc.git
cd dola-seedance25-30s-poc
npm install
npm run observe
```

程序会启动一个**独立的 Chrome 用户目录**：

```text
./user-data/dola-poc
```

首次运行：

1. 在弹出的 Chrome 中自行登录 Dola。
2. 不要复制 Cookie 到终端或仓库。
3. 正常创建一次你本来就有权限执行的短视频生成任务。
4. 观察终端是否出现 `[request]` / `[response]` 日志。
5. 关闭该 Chrome 窗口结束观察器。

本地候选请求会写入：

```text
captures/raw/dola-*.jsonl
```

该目录已经被 `.gitignore` 排除，不会进入公开仓库。

## G1 PASS 条件

满足以下全部条件才算 G1 通过：

- Chrome 正常启动。
- Dola 页面正常打开。
- 用户可以自行正常登录。
- 执行一次正常视频生成后，终端出现 Dola 相关 request/response 日志。
- raw JSONL 文件被创建。
- 代码没有要求输入或打印 Cookie / Authorization。

## 常见问题

### 找不到 Chrome

临时改用 Playwright Chromium：

```powershell
npx playwright install chromium
$env:DOLA_BROWSER_CHANNEL=""
npm run observe
```

### 想重新登录

删除本地：

```text
user-data/dola-poc
```

然后重新运行即可。

### 不要做

- 不要上传 `captures/raw/`。
- 不要把完整 HAR、Cookie、Token 贴到 GitHub Issue。
- 不要在 G1 阶段修改 duration 或重放未知生成请求。
