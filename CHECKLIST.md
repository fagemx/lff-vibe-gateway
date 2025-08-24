# 📋 發布前檢查清單

## ✅ 程式碼品質
- [ ] TypeScript 編譯無錯誤
- [ ] 所有依賴項都在 package.json 中正確列出
- [ ] 主程式 (`lff-vibe-gateway.ts`) 測試通過
- [ ] README.md 文檔完整且準確

## ✅ 套件配置
- [ ] package.json 中的版本號正確
- [ ] bin 欄位指向正確的執行檔案
- [ ] files 欄位包含所有必要檔案
- [ ] 關鍵字 (keywords) 設定完整

## ✅ 安全性
- [ ] 沒有硬編碼的敏感資訊
- [ ] .gitignore 排除敏感檔案
- [ ] 環境變數正確處理

## ✅ 使用者體驗
- [ ] 安裝指令簡單易用
- [ ] 錯誤訊息清晰易懂
- [ ] 支援常見的作業系統 (Windows, macOS, Linux)

## ✅ 文檔
- [ ] README.md 包含完整的安裝和使用指南
- [ ] 範例配置檔案準確
- [ ] 故障排除指南完整

## ✅ 測試
- [ ] 本地測試 `npm run build` 成功
- [ ] 本地測試 `npm pack` 並安裝成功
- [ ] 測試與 BigGo MCP Client 的整合

## ✅ 發布準備
- [ ] NPM 帳號有發布權限
- [ ] GitHub 倉庫已創建
- [ ] LICENSE 檔案存在
- [ ] 所有變更已提交到 Git

## 🚀 發布步驟
1. 執行檢查清單中的所有項目
2. 執行 `npm run build`
3. 執行 `npm publish --access public`
4. 推送到 GitHub
5. 創建 GitHub Release
6. 通知用戶新版本發布