# Playwriter Browser MCP

一个独立的 MCP (Model Context Protocol) 服务，通过 [Playwriter](https://github.com/remorses/playwriter) Chrome 扩展连接用户的真实浏览器，提供 **37 个结构化浏览器自动化工具**。

**对于任意 Agent 来说，只需添加一个 MCP 配置，就能操控用户真实的 Chrome 浏览器（带完整登录态）—— 无需 `--remote-debugging-port`，不受 Chrome 136+ 安全限制。**

## 为什么需要这个项目

| 方案 | 能用真实 Profile | 结构化工具 | 不需要调试端口 |
|------|:-:|:-:|:-:|
| Playwright MCP (`@playwright/mcp`) | ❌ | ✅ 38 个工具 | ❌ |
| Playwriter | ✅ | ❌ 仅 1 个 `execute` | ✅ |
| **Browser MCP (本项目)** | **✅** | **✅ 37 个工具** | **✅** |

Browser MCP = Playwriter 的连接方式 + Playwright MCP 的工具生态。

## 架构

```
AI Agent (Claude Code / VisionClaw / ...)
   │ MCP Protocol (HTTP / SSE)
   ▼
┌──────────────────────────────────┐
│  Browser MCP Server (port 3280)  │
│                                  │
│  37 个结构化工具:                 │
│  ├── browser_navigate            │
│  ├── browser_snapshot            │
│  ├── browser_click               │
│  ├── browser_type                │
│  ├── browser_take_screenshot     │
│  ├── ... (共 37 个)              │
│                                  │
│  连接层:                          │
│  Playwriter API → connectOverCDP │
└──────────────┬───────────────────┘
               │ WebSocket
               ▼
┌──────────────────────────────────┐
│  Playwriter Relay (port 19988)   │
│  (已有的 relay 或自动启动)        │
└──────────────┬───────────────────┘
               │ chrome.debugger API
               ▼
┌──────────────────────────────────┐
│  Chrome 浏览器 (用户真实 Profile) │
│  ├── 已登录的网站                 │
│  ├── Cookies / Sessions          │
│  └── Playwriter 扩展 (已安装)    │
└──────────────────────────────────┘
```

## 快速开始

### 前置条件

1. **Chrome 浏览器** — 安装 [Playwriter 扩展](https://chromewebstore.google.com/detail/playwriter-mcp/jfeammnjpkecdekppnclgkkffahnhfhe)
2. **Node.js >= 18**
3. **Playwriter CLI** — `npm install -g playwriter`

### 启动

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量（可选）
cp .env.example .env

# 3. 启动
npm run dev
```

服务启动后，MCP 端点在 `http://localhost:3280/mcp`。

### 多 Profile 场景

如果 Chrome 登录了多个 Google 账号，需要指定连接哪个：

```bash
# 查看可用的 Profile
playwriter browser list

# 指定 Profile 启动
PLAYWRITER_EXTENSION_ID="profile:104623951740642372686" npm run dev
```

## MCP 工具列表 (37 个)

### 导航

| 工具 | 说明 |
|------|------|
| `browser_navigate` | 导航到 URL，返回页面快照 |
| `browser_navigate_back` | 返回上一页 |

### 快照与截图

| 工具 | 说明 |
|------|------|
| `browser_snapshot` | 获取页面 accessibility tree（带 `[ref]` 标记，用于后续交互） |
| `browser_take_screenshot` | 截图（支持 png/jpeg、全页、指定元素） |

### 输入操作

| 工具 | 说明 |
|------|------|
| `browser_click` | 点击元素（通过 ref 定位） |
| `browser_type` | 向元素输入文本 |
| `browser_press_key` | 按下键盘按键（Enter、Tab、Escape 等） |
| `browser_hover` | 鼠标悬停在元素上 |
| `browser_drag` | 拖拽元素到目标 |
| `browser_select_option` | 在下拉框中选择选项 |
| `browser_fill_form` | 批量填写表单（文本框、复选框、单选按钮） |

### 页面管理

| 工具 | 说明 |
|------|------|
| `browser_tabs` | 标签页管理（list / new / close / select） |
| `browser_close` | 关闭当前页面 |
| `browser_wait_for` | 等待文本出现/消失或指定时间 |
| `browser_resize` | 调整浏览器窗口大小 |

### 代码执行

| 工具 | 说明 |
|------|------|
| `browser_evaluate` | 在页面中执行 JavaScript |
| `browser_run_code` | 运行 Playwright 代码片段 |

### 观测

| 工具 | 说明 |
|------|------|
| `browser_console_messages` | 获取控制台日志 |
| `browser_network_requests` | 获取网络请求列表 |

### 文件与对话框

| 工具 | 说明 |
|------|------|
| `browser_file_upload` | 上传文件到 file input |
| `browser_handle_dialog` | 处理 alert/confirm/prompt 弹窗 |

### Vision（坐标操作）

| 工具 | 说明 |
|------|------|
| `browser_mouse_move_xy` | 移动鼠标到坐标 |
| `browser_mouse_click_xy` | 在坐标处点击 |
| `browser_mouse_drag_xy` | 从坐标 A 拖拽到坐标 B |
| `browser_mouse_down` | 按下鼠标按键 |
| `browser_mouse_up` | 释放鼠标按键 |
| `browser_mouse_wheel` | 滚动鼠标滚轮 |

### 测试验证

| 工具 | 说明 |
|------|------|
| `browser_generate_locator` | 生成 Playwright locator（用于编写测试） |
| `browser_verify_text_visible` | 验证文本在页面上可见 |
| `browser_verify_element_visible` | 验证元素可见 |
| `browser_verify_list_visible` | 验证列表包含指定项 |
| `browser_verify_value` | 验证元素的值 |

### PDF 与追踪

| 工具 | 说明 |
|------|------|
| `browser_pdf_save` | 将页面保存为 PDF |
| `browser_start_tracing` | 开始录制 Playwright trace |
| `browser_stop_tracing` | 停止录制并保存 trace 文件 |

### 其他

| 工具 | 说明 |
|------|------|
| `browser_install` | 安装 Chromium 浏览器二进制文件 |
| `browser_session` | 诊断工具：检查连接状态（**无需主动调用，连接是自动的**） |

## 接入方式

### 作为 HTTP MCP Server

```json
{
  "mcpServers": {
    "browser": {
      "type": "http",
      "url": "http://localhost:3280/mcp"
    }
  }
}
```

### 接入 VisionClaw

在 VisionClaw 的 `mcp-servers.json` 中添加上述配置即可。Agent 无需任何额外操作，直接调用 `browser_navigate` 等工具，连接会自动建立。

## 工作流程示例

AI 使用这套工具的典型流程：

```
1. browser_navigate({ url: "https://x.com" })
   → 自动连接浏览器，导航到 X，返回页面快照

2. browser_snapshot()
   → 获取 accessibility tree，包含 [ref] 标记

3. browser_click({ ref: "compose-btn" })
   → 点击发帖按钮

4. browser_type({ ref: "tweet-input", text: "Hello World!" })
   → 输入帖子内容

5. browser_click({ ref: "post-btn" })
   → 发布
```

无需手动连接、创建 session、选择 tab —— 一切自动完成。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MCP_PORT` | `3280` | MCP HTTP 服务端口 |
| `PLAYWRITER_RELAY_PORT` | `19988` | Playwriter WebSocket relay 端口 |
| `PLAYWRITER_RELAY_HOST` | `127.0.0.1` | Relay 地址 |
| `PLAYWRITER_EXTENSION_ID` | （自动检测） | 多 Profile 时指定连接哪个扩展 |
| `OUTPUT_DIR` | `./output` | 截图、PDF、trace 文件输出目录 |

## 技术原理

传统方案需要 `--remote-debugging-port` 来让程序操控浏览器，但 Chrome 136+ 禁止在默认 Profile 上使用该参数。

本项目利用 Playwriter 的 Chrome 扩展，通过 `chrome.debugger` API 从浏览器内部获取 CDP 访问权限，再通过 WebSocket relay 转发给 Playwright。这样：

- ✅ 不需要 `--remote-debugging-port`
- ✅ 可以使用用户的真实 Chrome Profile（带登录态）
- ✅ 暴露 37 个结构化 MCP 工具（与 Playwright MCP 对齐）
- ✅ 连接自动建立，无需手动操作

## 开发

```bash
npm install          # 安装依赖
npm run dev          # 开发模式启动
npm run build        # 编译 TypeScript
npm run lint         # 类型检查
npm test             # 运行测试
```
