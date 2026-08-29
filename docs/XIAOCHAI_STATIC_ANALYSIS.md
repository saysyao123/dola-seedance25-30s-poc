# 小柴多开器 3.5.0 静态分析（Clean-room）

> 分析对象：用户提供的 Windows 安装包（文件名为 3.4.8，安装包内部版本资源与 package.json 为 3.5.0）。
>
> 本文只记录通过静态分析得到的结构与行为事实，不复制第三方程序源码，不包含账号凭据、Cookie、Token、平台安全签名或可用于绕过访问控制的实现细节。

## 1. 基本结论

- 安装包格式：NSIS 自解压安装包。
- 主程序技术栈：Electron。
- Electron 应用包：`resources/app.asar`。
- 应用名：`xiaochai-multi-launcher`。
- 内部版本：`3.5.0`。
- 主要运行依赖：Electron + `playwright-core`。
- Windows PE 安装包未发现 Authenticode 数字签名（Security Directory 为 0）。
- 安装包 SHA-256：`e9496ab9b63ce04562270ec32c977ae381b8d03b6b8702ed8ace49b849e52527`。

因此，这不是单纯浏览器插件，而是一个带完整 Chromium/Electron 运行时的桌面多账号容器。

## 2. 可确认的主要模块

静态资源中可以确认存在以下职责模块：

- 账号状态与迁移
- Dola 手动/嵌入登录
- Dola 批量登录辅助
- Dola 会话交接与校验
- Dola 视频协议适配
- Dola/Doubao 媒体资源解析
- 视频时长处理
- 多账号代理配置
- 账号级浏览器环境隔离
- 视频下载与媒体处理
- 软件授权、公告与升级

包内还声明其媒体下载逻辑参考了公开 MIT 项目/脚本，例如 hydrachs 的豆包资源脚本及 `doubao-dola-watermark-helper`。

## 3. 多账号架构

这是最值得我们借鉴的部分。

小柴不是在一个 Cookie Jar 里频繁切换账号，而是为每个账号创建独立的 Electron persistent session partition。

概念上类似：

```text
Desktop App
├── Account A -> persist partition A -> Dola WebView A
├── Account B -> persist partition B -> Dola WebView B
├── Account C -> persist partition C -> Dola WebView C
└── Account D -> persist partition D -> Dola WebView D
```

每个 partition 拥有自己的：

- Cookies
- Local Storage
- Cache
- 登录状态
- 网络 Session

账号 WebView 可以保持挂载，因此切换账号时不必重新登录，同时也能保留正在进行的对话/任务状态。

这比普通 Chrome Extension 更适合真正的多账号桌面软件。

## 4. Seedance 2.5 30 秒实现的关键判断

静态分析确认：该软件对 Seedance 2.5 的 30 秒请求有独立逻辑，并非简单把网页请求里的 `10` 修改为 `30`。

核心行为可以抽象为：

```text
Dola WebView 正常产生视频请求
        ↓
桌面程序识别 Seedance 视频任务
        ↓
只有用户明确选择 30s 时进入 2.5 专用路径
        ↓
根据当前真实浏览器会话重新组织请求结构
        ↓
通过同一 Electron account session 提交
        ↓
接收 SSE 任务确认
        ↓
把结果交回页面正常 UI 流程
        ↓
继续查询任务状态 / 解析最终视频
```

重要结论：

> 小柴作者自己在源码注释中明确区分了“表面修改网页请求”和“2.5 专用桌面请求结构”；前者可能仍然回落到普通网页时长，后者才是其 30 秒路径的核心。

因此，我们此前“只改 duration=30”的假设不完整。

## 5. Seedance 2.5 模型与时长识别

程序内部可以识别 Seedance 2.5，并且对 2.5 的专用 30 秒路径进行了显式处理。

其逻辑表明：

- Seedance 2.5 是独立模型类别；
- 30 秒不是通过视频文件后处理伪造；
- 生成任务仍然由 Dola 服务端创建；
- 客户端会等待服务端返回任务确认并继续轮询结果。

这进一步证明“小柴 30 秒”属于真实生成请求链，而不是 MP4 metadata 改时长。

## 6. 任务链

静态分析能确认其完整生命周期包括：

```text
submit
  ↓
SSE acknowledgement
  ↓
conversation / task identity
  ↓
chain polling
  ↓
terminal media
  ↓
download
```

也就是说，其工程价值不仅是“30 秒按钮”，还包括：

- 任务提交可靠性
- 避免重复提交
- 超时处理
- 状态轮询
- 结果解析
- 下载

这些都值得在我们的软件中重做。

## 7. 不建议复刻的部分

虽然小柴包含以下能力，但我们的项目不应照搬：

### 7.1 批量账号密码 / TOTP 自动登录

源码中存在 Playwright 驱动 Google 登录、密码输入及 TOTP 辅助逻辑。

我们的版本改为：

> 每个账号创建独立可见 WebView，由用户手动完成一次登录，之后 Chromium partition 持久化登录状态。

不保存 Google 密码，不保存 TOTP Secret。

### 7.2 指纹伪装 / 反检测

小柴包含账号级 User-Agent、Client Hints、语言、地区、时区及其他浏览器环境隔离逻辑。

我们的版本不实现用于规避平台风控的指纹伪装。

### 7.3 自动账号轮换刷额度

多账号能力只用于用户自己拥有/管理的账户与人工选择任务归属，不实现为了绕过单账号额度、速率限制或付费限制的自动轮换。

### 7.4 隐藏客户端协议复刻

Dola 当前服务条款明确限制逆向工程、绕过访问限制及违反限制的自动化使用。因此本仓库不会公开或实现平台安全签名、客户端身份伪装或访问控制绕过。

## 8. 软件自身网络行为的静态观察

静态代码显示小柴会访问自己的服务端：

- 软件 License 激活/校验/续费
- 邀请码
- 公告
- 软件更新

License 请求包含软件激活信息、设备 ID 哈希和应用版本。

在本次静态检查范围内，未发现明确把 Dola Cookie 或 Google 密码上传到该 License API 的调用路径。

但由于安装包没有 Authenticode 签名、软件拥有浏览器 Session/Cookie 访问权限，并支持远程自动更新，因此不建议把大量高价值账号长期托管在无法独立审计的第三方构建中。

## 9. Clean-room 可复用结论

我们真正应该复用的是架构思想：

1. Electron 作为桌面容器。
2. 每账号一个 persistent session partition。
3. 每账号一个长期存活的 Dola WebView。
4. 用户手动登录，不托管密码。
5. Account Manager 管理账号名称、状态、任务，而非保存凭据。
6. Task Manager 统一管理 submit / poll / result / download 生命周期。
7. Provider Adapter 隔离不同生成后端。
8. 本地保存任务历史与生成结果。
9. 所有 Secret 只保存在本机安全存储或环境配置，绝不进入 Git。

## 10. 推荐产品方向

我们的桌面工具不应成为“小柴破解复刻版”，而应成为：

> **Seedance Desktop Studio：多账号会话管理 + 多 Provider 视频任务工作台。**

建议支持两个 Provider：

### Provider A — Dola Web

- 多账号隔离
- 手动登录
- 正常使用官方网页能力
- 页面状态/任务观察
- 下载与历史管理
- 不绕过服务端 entitlement

### Provider B — BytePlus ModelArk / Seedance 2.5 API

- 官方 Seedance 2.5
- 原生 4–30 秒
- Text-to-Video
- Image-to-Video
- First + Last frame
- Multi-reference
- 异步 task polling
- 正常 API Key 鉴权

这条组合能保留小柴最好的用户体验，同时把真正需要长期稳定运行的 30 秒生成建立在官方可支持接口之上。
