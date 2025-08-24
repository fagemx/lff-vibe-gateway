#!/bin/bash

# LFF-VIBE MCP Gateway Installation Script
# This script helps users quickly install and configure the gateway

echo "🚀 LFF-VIBE MCP Gateway Installation"
echo "===================================="

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first:"
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js detected: $(node --version)"

# Install the gateway
echo "📦 Installing @lff-vibe/mcp-gateway..."
npm install -g @lff-vibe/mcp-gateway

if [ $? -eq 0 ]; then
    echo "✅ Installation completed!"
else
    echo "❌ Installation failed. Please check your permissions."
    exit 1
fi

# Find installation path
echo "🔍 Finding installation path..."
GATEWAY_PATH=$(npm list -g @lff-vibe/mcp-gateway | grep "@lff-vibe/mcp-gateway" | head -1)

if [ -z "$GATEWAY_PATH" ]; then
    echo "❌ Could not find installation path"
    exit 1
fi

# Extract the actual path
INSTALL_ROOT=$(npm root -g)
GATEWAY_EXECUTABLE="$INSTALL_ROOT/@lff-vibe/mcp-gateway/dist/src/lff-vibe-gateway.js"

echo "✅ Gateway installed at: $GATEWAY_EXECUTABLE"

# Create sample configuration
echo "📝 Creating sample BigGo configuration..."
cat > "biggo-lff-vibe-config.json" << EOF
{
  "mcpServers": {
    "lff-vibe-resume-analyzer": {
      "transport": "stdio",
      "enabled": true,
      "command": "node",
      "args": ["$GATEWAY_EXECUTABLE"],
      "env": {
        "MCP_SERVER_URL": "https://mcpice.com",
        "LFF_VIBE_API_KEY": "your-api-key-here"
      }
    }
  }
}
EOF

echo "✅ Sample configuration created: biggo-lff-vibe-config.json"
echo ""
echo "🔧 Next Steps:"
echo "1. Get your API key from LFF-VIBE team"
echo "2. Replace 'your-api-key-here' in biggo-lff-vibe-config.json"
echo "3. Use this configuration in your BigGo MCP Client"
echo ""
echo "📖 For more help, visit: https://github.com/lff-vibe/mcp-gateway"