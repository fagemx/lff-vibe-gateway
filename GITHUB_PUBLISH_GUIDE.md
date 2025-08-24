# 🚀 LFF-VIBE Gateway 發布流程

## 1️⃣ **GitHub 設定**

### 創建 GitHub 倉庫
```bash
# 1. 到 GitHub 創建新倉庫
# 倉庫名稱: mcp-gateway
# 組織: lff-vibe (或你的 GitHub 用戶名)
# 設為公開倉庫

# 2. 本地初始化
cd c:\ai_base\knowledge_base\LFF-VIBE\lff-vibe-gateway
git init
git add .
git commit -m "Initial release: LFF-VIBE MCP Gateway v1.0.0"

# 3. 連接到遠端倉庫
git remote add origin https://github.com/lff-vibe/mcp-gateway.git
git branch -M main
git push -u origin main
```

## 2️⃣ **NPM 設定與發布**

### 準備 NPM 帳號
```bash
# 1. 註冊 NPM 帳號 (如果沒有的話)
# 訪問: https://www.npmjs.com/signup

# 2. 登入 NPM
npm login
# 輸入用戶名、密碼、Email

# 3. 驗證登入狀態
npm whoami
```

### 組織設定 (推薦)
```bash
# 1. 創建 NPM 組織 (可選但推薦)
# 訪問: https://www.npmjs.com/org/create
# 組織名稱: lff-vibe

# 2. 邀請團隊成員到組織
# 在 NPM 網站上管理組織成員
```

### 本地構建和測試
```bash
# 1. 安裝依賴
npm install

# 2. 構建專案
npm run build

# 3. 本地測試
npm pack
# 這會創建 lff-vibe-mcp-gateway-1.0.0.tgz

# 4. 測試本地安裝
npm install -g ./lff-vibe-mcp-gateway-1.0.0.tgz

# 5. 測試命令
lff-vibe-gateway --help
npx @lff-vibe/mcp-gateway
```

### 發布到 NPM
```bash
# 1. 首次發布
npm publish --access public

# 2. 檢查發布結果
npm view @lff-vibe/mcp-gateway

# 3. 測試全球安裝
npm install -g @lff-vibe/mcp-gateway
```

## 3️⃣ **用戶使用方式**

發布成功後，用戶可以用以下方式使用：

### 方案一：NPX 直接執行 (推薦)
```bash
npx @lff-vibe/mcp-gateway
```

### 方案二：全域安裝
```bash
npm install -g @lff-vibe/mcp-gateway
lff-vibe-gateway
```

### 方案三：BigGo MCP 配置
```json
{
  "mcpServers": {
    "lff-vibe-resume-analyzer": {
      "transport": "stdio",
      "command": "npx",
      "args": ["@lff-vibe/mcp-gateway"],
      "env": {
        "MCP_SERVER_URL": "https://mcpice.com",
        "LFF_VIBE_API_KEY": "your-api-key"
      }
    }
  }
}
```

## 4️⃣ **維護和更新**

### 版本更新流程
```bash
# 1. 修改程式碼後
git add .
git commit -m "Fix: 修復連接問題"

# 2. 更新版本號
npm version patch  # 1.0.0 -> 1.0.1
# 或
npm version minor  # 1.0.0 -> 1.1.0
# 或  
npm version major  # 1.0.0 -> 2.0.0

# 3. 推送到 GitHub
git push origin main
git push --tags

# 4. 發布到 NPM
npm publish

# 5. 創建 GitHub Release
# 在 GitHub 網站上創建 Release，使用剛才的 tag
```

## 5️⃣ **監控和分析**

### 檢查下載統計
```bash
# NPM 下載量
npm view @lff-vibe/mcp-gateway

# 詳細統計
# 訪問: https://npmjs.com/package/@lff-vibe/mcp-gateway
```

### GitHub 統計
- Stars 和 Forks 數量
- Issues 和 Pull Requests
- Traffic 分析

## 6️⃣ **用戶支援**

### 文檔位置
- **GitHub**: https://github.com/lff-vibe/mcp-gateway
- **NPM**: https://npmjs.com/package/@lff-vibe/mcp-gateway
- **問題回報**: https://github.com/lff-vibe/mcp-gateway/issues

### 快速安裝指令
用戶只需要執行：
```bash
npx @lff-vibe/mcp-gateway
```

就能立即使用，無需任何預先安裝！