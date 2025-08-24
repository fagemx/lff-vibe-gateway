# LFF-VIBE MCP Gateway

A specialized gateway service that bridges stdio-based MCP clients (like BigGo MCP Client) with the LFF-VIBE Resume Analysis Service at `https://mcpice.com`. This gateway enables external users to access LFF-VIBE's powerful resume analysis capabilities through their preferred MCP client.

## 🎯 Why This Gateway?

- **Protocol Bridge**: Converts stdio MCP protocol to HTTP/SSE for LFF-VIBE service
- **Easy Installation**: One-command installation with npm or uvx  
- **BigGo Compatible**: Specifically designed to work with BigGo MCP Client
- **Secure**: Supports API key authentication for LFF-VIBE service
- **Resume Analysis**: Access to advanced resume analysis and job matching tools

## 🚀 Quick Start

### One-Command Usage (Recommended)

**No installation required!** Just use npx:

```bash
npx -y @lff-vibe/mcp-gateway@latest serve
```

### BigGo MCP Client Configuration

Copy this configuration to your BigGo MCP Client:

```json
{
  "mcpServers": {
    "lff-vibe-resume-analyzer": {
      "transport": "stdio",
      "enabled": true,
      "command": "npx",
      "args": ["-y", "@lff-vibe/mcp-gateway@latest", "serve"],
      "env": {
        "MCP_SERVER_URL": "https://mcpice.com",
        "LFF_VIBE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**That's it!** No paths, no global installation needed.

### Configuration for BigGo MCP Client

After installation, configure your BigGo MCP Client with the following settings:

#### 1. Find Gateway Installation Path

```bash
# For npm installation
npm list -g @lff-vibe/mcp-gateway

# Common paths:
# Windows: %AppData%\npm\node_modules\@lff-vibe\mcp-gateway\dist\src\lff-vibe-gateway.js
# macOS: /usr/local/lib/node_modules/@lff-vibe/mcp-gateway/dist/src/lff-vibe-gateway.js
# Linux: /usr/lib/node_modules/@lff-vibe/mcp-gateway/dist/src/lff-vibe-gateway.js
```

#### 2. BigGo MCP Configuration

Create or update your MCP configuration file:

**For BigGo MCP Client:**
```json
{
  "mcpServers": {
    "lff-vibe-resume-analyzer": {
      "transport": "stdio",
      "enabled": true,
      "command": "node",
      "args": ["/path/to/@lff-vibe/mcp-gateway/dist/src/lff-vibe-gateway.js"],
      "env": {
        "MCP_SERVER_URL": "https://mcpice.com",
        "LFF_VIBE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**For Claude Desktop (Alternative):**
```json
{
  "mcpServers": {
    "lff-vibe-resume-analyzer": {
      "command": "node",
      "args": ["/path/to/@lff-vibe/mcp-gateway/dist/src/lff-vibe-gateway.js"]
    }
  }
}
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MCP_SERVER_URL` | LFF-VIBE service URL | `https://mcpice.com` |
| `LFF_VIBE_SERVER_URL` | Alternative service URL | - |
| `AUTHORIZATION` | Authorization header value | - |
| `LFF_VIBE_API_KEY` | API key for authentication | - |

### Setting Environment Variables

**Windows:**
```cmd
set MCP_SERVER_URL=https://mcpice.com
set LFF_VIBE_API_KEY=your-secret-key
```

**macOS/Linux:**
```bash
export MCP_SERVER_URL=https://mcpice.com
export LFF_VIBE_API_KEY=your-secret-key
```

## 🛠️ Available Features

Once connected, you'll have access to LFF-VIBE's resume analysis tools:

- **Resume Parsing**: Extract structured information from resume documents
- **Skills Analysis**: Identify and categorize technical and soft skills
- **Job Matching**: Compare resumes against job requirements
- **Experience Evaluation**: Analyze work experience and career progression
- **Education Assessment**: Validate educational background
- **Format Optimization**: Suggest resume format improvements

## 🔍 Troubleshooting

### 1. Connection Issues

```bash
# Check if the gateway can reach LFF-VIBE
curl -I https://mcpice.com

# Test with debug output
DEBUG=1 node /path/to/lff-vibe-gateway.js
```

### 2. Authentication Problems

- Verify your API key is correct
- Check that the API key has proper permissions
- Ensure the Authorization header format is correct

### 3. Path Issues

```bash
# Find npm global packages
npm root -g

# List installed packages
npm list -g @lff-vibe/mcp-gateway

# Check Node.js installation
node --version
npm --version
```

### 4. BigGo MCP Client Configuration

- Ensure `transport` is set to `"stdio"`
- Verify the command path is absolute
- Check that all required args are provided
- Validate the JSON configuration syntax

## 🔒 Security

- API keys are transmitted securely via HTTPS
- No sensitive data is logged or stored locally
- Connections use standard TLS encryption
- Session management follows MCP security best practices

## 📖 Examples

### Basic Usage with BigGo

1. Install the gateway:
   ```bash
   npm install -g @lff-vibe/mcp-gateway
   ```

2. Get your installation path:
   ```bash
   npm list -g @lff-vibe/mcp-gateway
   ```

3. Configure BigGo with the gateway path and your API key

4. Start using resume analysis features in BigGo!

### Advanced Configuration

For production environments, consider:

```bash
# Set permanent environment variables
echo 'export LFF_VIBE_API_KEY=your-key' >> ~/.bashrc
echo 'export MCP_SERVER_URL=https://mcpice.com' >> ~/.bashrc
source ~/.bashrc
```

## 🤝 Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Verify your network connectivity to `https://mcpice.com`
3. Ensure your API key is valid and active
4. Check the gateway logs for detailed error messages

## 📝 License

Apache 2.0 License - see LICENSE file for details.

## 🙏 Acknowledgments

This project is based on [@mcphub/gateway](https://github.com/mcphub/gateway) (Apache 2.0 License). We extend our gratitude to the original contributors for their excellent work on MCP protocol bridging.

**Key adaptations for LFF-VIBE:**
- Customized for `https://mcpice.com` service endpoint
- Enhanced BigGo MCP Client compatibility
- Specialized resume analysis workflow integration
- LFF-VIBE branding and documentation

## 🔗 Related

- [LFF-VIBE Project](https://github.com/lff-vibe)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [BigGo MCP Client](https://biggo.com)

---

Made with ❤️ by the LFF-VIBE Team