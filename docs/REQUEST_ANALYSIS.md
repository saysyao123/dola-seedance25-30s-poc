# Request Analysis

本文件只记录协议层发现。未经真实样本验证的字段必须写成 hypothesis。

## 当前已知

### 来源：公开参考项目

- Dola 视频生成属于网页会话内的视频能力调用。
- 旧版公开实现曾通过识别视频生成 ability 并修改 model/duration 完成 Seedance 2.0 15s。
- Dola 与 Doubao 在账号、视频 ID、CDN 与部分请求参数上存在差异。
- Seedance 2.5 本身支持原生 30 秒，但 Dola 的 30 秒 Web 请求结构仍需本项目用当前真实样本验证。

## 待验证字段

| 字段/概念 | 当前状态 | 说明 |
|---|---|---|
| model identifier for Seedance 2.5 | hypothesis | 不预设内部 model 字符串 |
| duration=30 | hypothesis | 可能必要，但不能假设充分 |
| generation scene/mode | hypothesis | 30s T2V 可能使用独立模式 |
| ability type | observed in older implementation | 当前 2.5 是否保持一致待验证 |
| feature flags | hypothesis | 需对比 10s/30s |
| task/conversation id | hypothesis | 需捕获当前生命周期 |
| poll endpoint | hypothesis | 需由实际生成过程识别 |
| result/video id | observed conceptually in older implementation | 当前字段名待验证 |

## 样本命名约定

脱敏后的样本建议：

```text
captures/sanitized/
  t2v-10s-request.json
  t2v-10s-response.json
  t2v-30s-request.json
  t2v-30s-response.json
```

真实原始文件只能放：

```text
captures/raw/
```

该目录已被 `.gitignore` 排除。

## Diff 原则

对比前先消除噪声：

- timestamp
- random IDs
- conversation IDs
- message IDs
- device/browser IDs
- signatures
- cookies/tokens
- locale/trace 字段（若与功能无关）

重点保留：

- model
- duration
- generation mode/scene
- ability parameters
- reference media parameters
- aspect ratio / resolution
- capability/feature flags

## Gate G4 结论模板

当获得真实样本后，只能按下面格式下结论：

- **Observed differences:** 实际不同的字段
- **Likely functional differences:** 有理由认为影响 30s 的字段
- **Dynamic/noise differences:** 与任务身份/时间相关的变化
- **Verified minimum set:** 经过实际任务证明必要的最小字段集
