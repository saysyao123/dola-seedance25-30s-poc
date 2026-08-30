# Dola D01/D02：每日 5 秒容量账本与安全轮询

公开文档使用 `D01`、`D02` 逻辑标签；真实账号资料只保存在用户本机。

## 账本规则

Electron 应用将每日账本保存在本机用户数据目录的
`dola-daily-capacity.jsonl`，不写入仓库。统计日按 `Asia/Shanghai` 00:00
切换；这只是报表边界，不代表服务端必然在同一时间刷新额度。

每条真实任务分开记录：

```text
generation_result=PASS
  = 真实 Seedance 2.5 / 5 秒任务完成

delivery_result=PASS
  = 授权原始文件已下载，并通过 FFprobe 与可见水印 QA
```

同一 `job_id` 恢复重放时以最新记录为准，避免重复统计。模拟调度、UI 余额、
本地计数器和历史成功记录都不能单独证明额度。

## 状态和轮询

| 状态 | 处理 |
| --- | --- |
| `unknown` | 可以在登录和用户确认通过后继续测试；容量仍为 UNKNOWN |
| `available` | 按正常顺序继续 |
| `daily_complete` | 明确服务端达到当日上限；允许继续下一个正常账号 |
| `needs_login` | 等待账号所有者登录，可跳过但不视为额度完成 |
| `restricted` / `rate_limited` | 停止轮询，人工复核，不得换号规避 |

默认单 Worker 顺序为 `D01 -> D02`。只有明确的 `daily_complete` 才能触发自动
切换；任务一旦绑定账号，就不能中途换号。容量在获得明确服务端完成证据前
保持 `UNKNOWN`，同时展示每个账号的成功、失败和 clean delivery 数量。

## Electron 接口契约

桌面主进程提供本地 IPC：

```text
capacity:report
capacity:record-job
capacity:provider-state
capacity:next-account
```

账本写入使用 flush/fsync；只写事件、逻辑账号 ID、任务 ID、模型、时长和结果，
不写入原始响应、凭证或签名媒体地址。
