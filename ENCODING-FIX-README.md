# Windows 編碼問題修復指南

## 🐛 問題描述

在 Windows 系統上運行 LFF-VIBE MCP Gateway 時可能遇到編碼錯誤：
```
'cp950' codec can't encode character '\u68c0' in position 7554: illegal multibyte sequence
```

## ✅ 解決方案

### 方案 A：使用修復版 Gateway (推薦)

使用 v0.3.3 或更新版本，已包含編碼修復：

```json
{
  "mcpServers": {
    "lff-vibe-resume-analyzer": {
      "transport": "stdio",
      "enabled": true,
      "command": "npx",
      "args": ["-y", "@lff-vibe/mcp-gateway@0.3.3", "serve"],
      "env": {
        "MCP_SERVER_URL": "https://mcpice.com",
        "LFF_VIBE_API_KEY": "your-api-key-here",
        "PYTHONIOENCODING": "utf-8",
        "NODE_OPTIONS": "--max-old-space-size=4096"
      }
    }
  }
}
```

### 方案 B：環境變數修復

如果仍有問題，可以添加額外的編碼環境變數：

```json
{
  "env": {
    "MCP_SERVER_URL": "https://mcpice.com",
    "LFF_VIBE_API_KEY": "your-api-key-here",
    "PYTHONIOENCODING": "utf-8",
    "LANG": "en_US.UTF-8",
    "LC_ALL": "en_US.UTF-8",
    "NODE_OPTIONS": "--max-old-space-size=4096"
  }
}
```

### 方案 C：手動設置 PowerShell 編碼

在運行前設置 PowerShell 編碼：

```powershell
$env:PYTHONIOENCODING="utf-8"
chcp 65001
```

## 🔧 v0.3.3 修復內容

1. **自動 Windows 編碼檢測**：自動設置正確的輸出編碼
2. **安全輸出函數**：防止編碼錯誤導致程序崩潰
3. **ASCII 回退機制**：無法輸出 Unicode 時自動轉換為安全字符
4. **移除中文註釋**：避免源代碼中的編碼問題

## 🎯 預期結果

修復後，您應該看到：
```
Starting LFF-VIBE MCP Gateway Enhanced...
Connecting to: https://mcpice.com
Authorization: Configured
Connecting to LFF-VIBE SSE endpoint: https://mcpice.com/mcp/sse
--- LFF-VIBE backend connected successfully
✅ 不再有編碼錯誤！
```

## 🛠️ 故障排除

如果仍有編碼問題：

1. **確認版本**：確保使用 v0.3.3 或更新版本
2. **重啟終端**：重啟 PowerShell 或 Command Prompt
3. **檢查區域設置**：確認 Windows 系統區域設置
4. **使用 WSL**：考慮在 WSL 環境中運行（UTF-8 原生支持）

## 📞 支援

如果問題持續，請提供：
- Windows 版本
- PowerShell 版本 (`$PSVersionTable`)
- 完整錯誤訊息
- BigGo MCP Client 配置
