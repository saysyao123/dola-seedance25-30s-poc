# Captures

## 目录规则

- `captures/raw/`：真实本地抓包，只能存在用户电脑，已被 `.gitignore` 排除。
- `captures/sanitized/`：经过人工复核和自动脱敏后，才允许提交用于结构分析。

## 禁止进入仓库的内容

- Cookie / `sessionid` / `ttwid`
- Authorization / Bearer Token
- `s_v_web_id`、fp、设备标识
- 真实 conversation/message/task/user ID
- 请求签名或可复用的身份凭据
- 浏览器 Profile

## 推荐工作流

1. `npm run observe`
2. 在可见浏览器里自己登录 Dola。
3. 正常做一个短视频生成测试。
4. Observer 把候选请求写入 `captures/raw/*.jsonl`。
5. 后续 Sanitizer 从 raw 生成最小化的 `captures/sanitized/*.json`。
6. 人工检查 sanitized 文件中不存在真实凭据后再允许提交。

第一阶段不要手工复制完整 Cookie、Headers 或 HAR 到 GitHub Issue/聊天中。
