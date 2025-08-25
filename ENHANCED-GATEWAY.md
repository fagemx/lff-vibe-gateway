# LFF-VIBE MCP Gateway Enhanced v0.3.0

## 🚀 增強功能說明

這個增強版 Gateway 專門解決了 FastMCP 的 session 管理和協議相容性問題。

### ✅ 修復的問題

1. **消息端點路徑修正**
   - 舊版：`/message?sessionId=xxx` ❌
   - 新版：`/messages/?session_id=xxx` ✅

2. **正確的 SSE 端點路由**
   - 舊版：直接連接 `/sse` ❌  
   - 新版：透過 Nginx 路由 `/mcp/sse` ✅

3. **智能會話初始化**
   - 自動解析 FastMCP 的 session_id 格式
   - 主動發送 `tools/list` 來驗證會話
   - 錯誤恢復和重連機制

4. **增強的錯誤處理**
   - 404 錯誤自動重連
   - 超時和重試邏輯
   - 詳細的調試日誌

### 🔧 主要改進

#### 1. FastMCP 協議相容性
```javascript
// 正確的端點配置
const backendUrlSse = `${baseUrl}/mcp/sse`;  // 透過 Nginx 路由
const backendUrlMsg = `${baseUrl}/messages/`; // FastMCP 標準端點
```

#### 2. 會話管理智能化
```javascript
// 解析 FastMCP 的 session_id 格式
const match = event.data.match(/session_id=([^&\s]+)/);
if (match) {
    this.sessionId = match[1];
    this.initializeSession(); // 主動初始化
}
```

#### 3. 錯誤恢復機制
```javascript
if (response.status === 404) {
    debug("Messages endpoint not found - checking FastMCP configuration");
    this.reconnect(); // 自動重連
}
```

### 📋 使用方法

#### BigGo MCP Client 配置 (推薦)
```json
{
  "mcpServers": {
    "lff-vibe-resume-analyzer-enhanced": {
      "transport": "stdio",
      "enabled": true,
      "command": "npx",
      "args": ["-y", "@lff-vibe/mcp-gateway@0.3.0", "serve"],
      "env": {
        "MCP_SERVER_URL": "https://mcpice.com",
        "LFF_VIBE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

#### 本地測試配置
```json
{
  "mcpServers": {
    "lff-vibe-local": {
      "transport": "stdio",
      "enabled": true,
      "command": "node",
      "args": ["path/to/lff-vibe-gateway/index.js"],
      "env": {
        "MCP_SERVER_URL": "http://localhost:8080",
        "LFF_VIBE_API_KEY": ""
      }
    }
  }
}
```

### 🐛 調試資訊

增強版 Gateway 提供詳細的調試日誌：

```
Starting LFF-VIBE MCP Gateway...
Connecting to: https://mcpice.com/mcp/
Authorization: Configured
Connecting to LFF-VIBE SSE endpoint: https://mcpice.com/mcp/sse
--- LFF-VIBE backend connected successfully
Received endpoint event: /messages/?session_id=xxxxx
LFF-VIBE session ID extracted: xxxxx
LFF-VIBE MCP Gateway is running and ready
```

### 🔄 版本更新

從舊版本升級：
```bash
# 直接使用最新版本，無需手動更新
npx -y @lff-vibe/mcp-gateway@latest serve
```

### 🛠️ 故障排除

#### 1. 會話無法建立
```
LFF-VIBE session not ready, queuing message
```
**解決方案**：檢查 FastMCP 服務是否正常運行，確認 `/mcp/sse` 端點可訪問。

#### 2. 消息端點 404
```
Messages endpoint not found - checking FastMCP configuration
```
**解決方案**：確認 Nginx 配置中的 `/messages/` 路由正確。

#### 3. 授權失敗
```
LFF-VIBE authorization failed - check API key
```
**解決方案**：檢查 `LFF_VIBE_API_KEY` 環境變數設定。

### 📊 與舊版本對比

| 功能 | 舊版本 v0.2.3 | 增強版 v0.3.0 |
|------|---------------|---------------|
| 消息端點 | `/message` ❌ | `/messages/` ✅ |
| Session 格式 | `sessionId=` ❌ | `session_id=` ✅ |
| 錯誤恢復 | 基本 | 智能重連 ✅ |
| 會話初始化 | 被動 | 主動驗證 ✅ |
| 調試日誌 | 簡單 | 詳細分析 ✅ |

### 🎯 接下來

1. **測試連接**：使用增強版 Gateway 重新測試 BigGo 連接
2. **驗證工具**：確認 resume analysis 工具正常可用
3. **效能監控**：觀察會話穩定性和錯誤率

**這個增強版本應該完全解決之前遇到的 FastMCP session 管理問題！** 🎉
