# Dola Seedance 2.5：5 秒生成与无水印文件验收

本文件只公开流程与验收规则，不包含账号名、账号 ID、Cookie、Token、浏览器
Profile、原始响应、签名媒体 URL 或本地视频。

## 当前稳定路径

```text
Electron Desktop Studio
  -> 每个 Dola 账号独立 persistent partition
  -> 用户在可见 Dola WebView 中手动登录
  -> 生成前安装只读网络/页面捕获
  -> 用户确认 Seedance 2.5 / 5 秒任务
  -> 媒体身份立即绑定当前账号和 partition
  -> Resolver 只比较已授权候选
  -> 拒绝预览和显式 watermark 候选
  -> 原始文件下载
  -> .part + Content-Length + MP4 ftyp + SHA-256
  -> FFprobe + 首/中/尾帧水印检查
  -> 全部通过后才标记 clean delivery PASS
```

字段名 `original_media_info`、`main_url`、`video_list` 等只能作为候选线索。
没有实际 MP4 和文件级 QA 时，结果必须为 `UNVERIFIED` 或 `NOT_AVAILABLE`，
不能通过重新编码或擦除水印制造“原片”。

## 生成契约

容量测试只接受：

```text
model = seedance-v2.5
target duration = 5 seconds
```

每个任务从捕获、解析、下载到 QA 始终绑定同一账号和 session partition；身份
不一致时必须停止并记录失败。

## 公开边界

- 不读取或导出密码、Cookie、Token、验证码、Passkey 或浏览器 Profile；
- 不绕过 CAPTCHA、地区限制、账号权限、付费限制、速率限制或生成额度；
- 不以多账号规避平台限制；
- 不把本地运行时账本、原始抓包、签名 URL 或生成视频提交到公开仓库。
