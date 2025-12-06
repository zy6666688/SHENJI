# H5 与小程序互通技术方案（草稿）

## 1. 背景与目标

### 1.1 项目背景
- 项目名称：审计数智析（智能审计小程序 + H5 管理端）
- 业务需求：
用户在审计现场主要使用 微信小程序 完成拍照取证、简单操作。
在复杂编辑、数据分析、报告查看等场景下，希望跳转到 H5 页面，获得更强的交互能力。
小程序、H5、后端三端之间的数据需要统一、同步、可追踪。
- 简单理解：
希望“把小程序和网页打通”，让用户既能在小程序上高效采集数据，又能在 H5 上完成复杂操作，且两端始终保持数据一致。

### 1.2 建设目标
- 双向通信能力
支持 H5 与微信小程序之间的可靠双向通信。
例如：在 H5 中编辑完成后，小程序界面可以实时获得结果并更新 UI。
- 统一平台适配层
构建统一的平台适配层，屏蔽 H5 / 小程序 在 API、存储、导航等方面的差异。
业务层只调用统一接口，无需关心当前运行环境，从而降低重复开发和维护成本。
- 离线能力与数据同步
结合现有 SyncManager，在弱网或离线场景下仍可完成关键操作。
当网络恢复时，自动进行数据同步，避免数据丢失和冲突，保障审计过程的连续性和可靠性。

## 2. 典型场景

### 2.1 凭证拍照上传 → H5 预览/编辑 → 回传小程序

- 小程序侧
用户在小程序中拍摄或选择凭证照片。
凭证可以在小程序中直接浏览，也可以通过互通方案跳转到 H5 进行进一步处理。
- H5 侧
提供更丰富的查看与编辑能力：
    大图预览、缩放
    备注编辑
    标签管理等
更适合在 PC 或大屏环境下工作。
- 数据回传
H5 编辑完成后，将结果（备注、标签等）通过通信机制回传：
    更新小程序界面展示
    同时写入后端数据库，保证前后台数据一致。

### 2.2 底稿节点编辑（H5 富文本/表格） → 同步至小程序

- H5 侧
提供类似 Word/Excel 的富文本、表格编辑能力，用于底稿内容编辑与维护。
支持复杂排版、结构化录入。
- 小程序侧
以简化视图展示底稿的摘要信息和进度状态，方便现场人员快速了解当前审计进展。
不承载复杂编辑逻辑，保持交互轻量。
- 同步机制
通过统一接口 + SyncManager：
    将 H5 编辑结果同步至小程序和后端。
    处理可能出现的并发修改／冲突场景（如多人同时编辑同一底稿）。

### 2.3 AI 分析结果展示（H5 图表/报告） → 小程序内嵌查看

- H5 侧
调用 AI 能力（如 Qwen API、OCR、证据链分析等），生成图表、报告、洞察结论。
以图表、可视化报告形式展示分析结果，支持丰富交互。
- 小程序侧
通过内嵌 H5 （如 web-view）查看 AI 分析结果。
在必要时支持简单交互（如点击图表查看某条凭证详情）。
- 目标
让用户在小程序内即可访问完整的 AI 分析能力，无需切换多端登录，多端体验连贯一致。

## 3. 技术选型（初稿）

### 3.1 小程序内嵌 H5

- **容器组件**：微信小程序 `web-view`
- **H5 侧实现**：
  - 使用本项目现有 H5 构建产物（基于 uni-app + Vite + Vue3）
  - 或预留支持独立 H5 页面（单独部署），通过配置化指定 URL

选择原因：

- `web-view` 是微信官方推荐的小程序内嵌 H5 方案，兼容性和能力较稳定。
- 当前项目已经基于 uni-app 构建，复用现有 H5 能力成本最低。

### 3.2 通信方式

- **小程序 → H5**
  - 使用 `web-view` 组件的 `postMessage` 能力：
    - 小程序通过 `web-view` 的 `postMessage` 接口向 H5 发送消息。
    - H5 通过 `window.addEventListener('message', ...)` 接收消息。

- **H5 → 小程序**
  - 方案一：`postMessage` 反向通信（优先）
    - H5 调用 `window.parent.postMessage(...)` 或 `WeixinJSBridge` 提供的接口，传递消息到小程序。
    - 小程序通过 `web-view` 组件的消息事件接收并分发。
  - 方案二：基于 URL 参数 / 路由跳转的“弱通信”
    - 在 H5 完成操作后，通过改变 URL / 调用后端接口，间接让小程序轮询或刷新。

- **统一事件总线（Bridge 层）**
  - 封装一个 `Bridge` 类，对外提供统一接口：
    - `send(event: string, payload?: any)`：发送事件
    - `on(event: string, handler: (payload: any) => void)`：订阅事件
  - 小程序端和 H5 端分别维护各自的 `Bridge` 实现，对上层业务屏蔽底层 `postMessage` / `WeixinJSBridge` 等细节。

### 3.3 平台适配与架构

- **平台适配层（已有）**：[PlatformAdapter](cci:2://file:///d:/Yang/ShenJi/SHENJI-master/src/utils/platform.ts:84:0-676:1)（[src/utils/platform.ts](cci:7://file:///d:/Yang/ShenJi/SHENJI-master/src/utils/platform.ts:0:0-0:0)）
  - 已封装：
    - 登录（小程序登录 / H5 登录）
    - 本地存储（`uniStorage` / `localStorage`）
    - 文件选择与上传
    - 网络状态检测与监听
    - UI 能力（toast、loading、modal 等）
  - 作用：
    - 屏蔽 H5 / 小程序 API 差异，为业务提供统一接口。

- **互通适配层（待新增）**：`BridgeAdapter`（拟新增）
  - 职责：
    - 统一封装 H5 ↔ 小程序之间的消息协议和事件处理。
    - 提供稳定的 `send` / `on` 等方法。
  - 形态：
    - 使用 TypeScript 接口定义能力边界，例如：
      - `IBridge { send(event, payload): void; on(event, handler): void; off(event, handler): void }`
    - 不同运行环境（H5 / 小程序）提供各自实现。

- **语言与工具**
  - 使用 TypeScript 编写适配器与协议定义，提升类型安全性与可维护性。
  - 使用现有打包工具（Vite + uni-app）集成 `BridgeAdapter`，避免引入多余构建复杂度。

## 4. 通信协议设计（初稿）

### 4.1 消息数据结构

为保证 H5 与小程序之间通信的一致性和可扩展性，约定统一的消息结构：

```ts
interface BridgeMessage {
  type: 'REQUEST' | 'RESPONSE' | 'EVENT';
  source: 'miniapp' | 'h5';
  event: string;        // 例如：'open-evidence'、'save-node'、'sync-complete'
  requestId?: string;   // 请求-响应配对用 ID（可选）
  payload?: any;        // 业务数据，如凭证信息、节点内容等
  error?: {
    code: string;       // 错误码，如 'UNAUTHORIZED'、'NETWORK_ERROR'
    message: string;    // 错误描述，便于前端展示或日志记录
  };
}
```
说明：
type：
    REQUEST：表示一次请求，例如 H5 请求小程序打开某页面。
    RESPONSE：对某次 REQUEST 的响应，需带上对应的 requestId。
    EVENT：单向事件广播，例如“保存成功”、“同步完成”等。
source：标识消息来源，便于调试和安全控制。
event：业务事件名，后续会形成固定枚举列表。
payload：承载具体业务数据，格式根据事件类型约定。
### 4.2 事件与数据格式（JSON Schema 草案）
这里列出第一批需要支持的核心事件（可逐步扩展）：
1.打开凭证编辑页
事件名：open-evidence
方向：小程序 → H5
示例 payload：
```
{
  "evidenceId": "ev_123",
  "projectId": "proj_001",
  "imageUrl": "https://oss.xxx.com/xxx.jpg",
  "token": "xxxxx"
}
```
2.凭证编辑结果保存
事件名：save-evidence
方向：H5 → 小程序（请求）
示例 payload：
```
{
  "evidenceId": "ev_123",
  "projectId": "proj_001",
  "remark": "这是一条测试备注",
  "tags": ["收入", "重要"],
  "updatedBy": "user_001"
}
```
对应响应（type: 'RESPONSE'）：
```
{
  "type": "RESPONSE",
  "source": "miniapp",
  "event": "save-evidence",
  "requestId": "req_001",
  "payload": {
    "success": true
  }
}
```
3.底稿节点编辑保存
事件名：save-node
方向：H5 → 小程序
示例 payload：
```
{
  "nodeId": "node_123",
  "projectId": "proj_001",
  "content": "<p>富文本内容...</p>",
  "version": 3
}
```
4.同步完成通知
事件名：sync-complete
方向：小程序 → H5 或 H5 → 小程序
示例 payload：
```
{
  "projectId": "proj_001",
  "syncedCount": 12,
  "failedCount": 0
}
```

## 5. Demo 设计（第一版）

### 5.1 小程序端 Demo

- 页面路径
/pages/bridge-demo/index
- 设计目标
提供一个简单、可演示的页面，用于验证“小程序 ↔ H5 通信链路是否打通”。
- 功能说明
展示一个按钮：「打开 H5 编辑页」
    点击后，跳转到内嵌的 H5 页面（使用 <web-view>）。
使用 <web-view> 打开 H5 页面，并携带必要参数，例如：
    ?token=xxx&userId=xxx&projectId=xxx
    H5 通过这些参数识别当前用户和项目，完成权限校验与数据关联。
监听 H5 发回的消息（如 save-success / save-failed）：
    收到消息后，在小程序中通过 toast 或弹窗给出明确反馈，提示用户“保存成功 / 失败”。

### 5.2 H5 端 Demo

- 页面路径
/h5/bridge-demo
- 设计目标
构建一个简单的 H5 页面，用于验证参数传递与消息通信能力，不追求复杂业务逻辑。
- 功能说明
解析 URL 参数
    页面加载时，从 URL 中解析 token、userId、projectId 等参数。
    基于这些参数，后续可以扩展为鉴权、拉取项目数据等操作。
模拟编辑表单
    提供一个简化的编辑区域（例如单个输入框），模拟实际业务中的“底稿编辑 / 备注编辑”。
保存动作与消息发送
    用户点击「保存」按钮时：
        将表单内容打包为消息体（包括必要的上下文信息，如项目 ID）。
        通过 postMessage 发送给小程序端，事件名例如：save-node。
接收小程序反馈
    监听小程序返回的 save-success / save-failed 事件。
    在 H5 页面中展示结果提示（如“保存成功，已同步到小程序”），形成完整闭环。