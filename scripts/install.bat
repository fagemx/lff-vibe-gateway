@echo off
echo 🚀 LFF-VIBE MCP Gateway Installation
echo ====================================

REM Check Node.js installation
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first:
    echo    Visit: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js detected
node --version

REM Install the gateway
echo 📦 Installing @lff-vibe/mcp-gateway...
npm install -g @lff-vibe/mcp-gateway

if %errorlevel% neq 0 (
    echo ❌ Installation failed. Please check your permissions.
    pause
    exit /b 1
)

echo ✅ Installation completed!

REM Find installation path
echo 🔍 Finding installation path...
for /f "tokens=*" %%i in ('npm root -g') do set INSTALL_ROOT=%%i
set GATEWAY_EXECUTABLE=%INSTALL_ROOT%\@lff-vibe\mcp-gateway\dist\src\lff-vibe-gateway.js

echo ✅ Gateway installed at: %GATEWAY_EXECUTABLE%

REM Create sample configuration
echo 📝 Creating sample BigGo configuration...
(
echo {
echo   "mcpServers": {
echo     "lff-vibe-resume-analyzer": {
echo       "transport": "stdio",
echo       "enabled": true,
echo       "command": "node",
echo       "args": ["%GATEWAY_EXECUTABLE:\=\\%"],
echo       "env": {
echo         "MCP_SERVER_URL": "https://mcpice.com",
echo         "LFF_VIBE_API_KEY": "your-api-key-here"
echo       }
echo     }
echo   }
echo }
) > biggo-lff-vibe-config.json

echo ✅ Sample configuration created: biggo-lff-vibe-config.json
echo.
echo 🔧 Next Steps:
echo 1. Get your API key from LFF-VIBE team
echo 2. Replace 'your-api-key-here' in biggo-lff-vibe-config.json
echo 3. Use this configuration in your BigGo MCP Client
echo.
echo 📖 For more help, visit: https://github.com/lff-vibe/mcp-gateway
pause