# LFF-VIBE Gateway 發布指南

## 📦 發布到 NPM

### 1. 準備發布

```bash
# 1. 確保已登入 NPM
npm login

# 2. 安裝依賴並構建
npm install
npm run build

# 3. 測試本地安裝
npm pack
npm install -g lff-vibe-mcp-gateway-1.0.0.tgz
```

### 2. 發布流程

```bash
# 發布到 NPM（首次發布）
npm publish --access public

# 更新版本並發布
npm version patch  # 或 minor, major
npm publish
```

### 3. 驗證發布

```bash
# 測試全域安裝
npm install -g @lff-vibe/mcp-gateway

# 測試 npx 執行
npx @lff-vibe/mcp-gateway --help
```

## 🐙 發布到 GitHub

### 1. 創建 GitHub 倉庫

1. 到 GitHub 創建新倉庫：`lff-vibe/mcp-gateway`
2. 設定為公開倉庫
3. 添加 README.md 和 LICENSE

### 2. 推送程式碼

```bash
# 初始化 Git 倉庫
git init

# 添加遠端倉庫
git remote add origin https://github.com/lff-vibe/mcp-gateway.git

# 添加檔案並提交
git add .
git commit -m "Initial release: LFF-VIBE MCP Gateway v1.0.0"

# 推送到 GitHub
git branch -M main
git push -u origin main
```

### 3. 創建 Release

1. 到 GitHub 倉庫頁面
2. 點擊 "Releases" → "Create a new release"
3. 標籤版本：`v1.0.0`
4. 發布標題：`LFF-VIBE MCP Gateway v1.0.0`
5. 說明：包含功能特點和安裝指南

## 🔄 持續維護

### 更新流程

```bash
# 1. 更新程式碼
# 2. 更新版本號
npm version patch

# 3. 重新構建
npm run build

# 4. 發布到 NPM
npm publish

# 5. 推送到 GitHub
git push origin main
git push --tags
```

### 版本管理

- **patch (1.0.x)**：Bug 修復
- **minor (1.x.0)**：新功能，向後相容
- **major (x.0.0)**：重大變更，可能不相容

## 📊 使用統計

發布後可以追蹤：
- NPM 下載量：https://npmjs.com/package/@lff-vibe/mcp-gateway
- GitHub Stars 和 Forks
- 用戶回饋和 Issues

## 🎯 用戶體驗

用戶將能夠：

```bash
# 方案 1：全域安裝
npm install -g @lff-vibe/mcp-gateway
lff-vibe-gateway

# 方案 2：直接執行（推薦）
npx @lff-vibe/mcp-gateway

# 方案 3：從 GitHub 安裝開發版
npm install -g git+https://github.com/lff-vibe/mcp-gateway.git
```