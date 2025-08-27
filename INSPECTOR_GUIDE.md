# MCP Inspector Guide

This guide provides comprehensive information about using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) with the ComfyUI MCP Server.

## Overview

The MCP Inspector is the official visual testing tool for MCP servers. It provides both UI and CLI modes for testing and debugging your MCP server implementation.

## Installation

The inspector can be run directly via npx:
```bash
npx @modelcontextprotocol/inspector
```

## UI Mode vs CLI Mode

| Use Case | UI Mode | CLI Mode |
|----------|---------|----------|
| **Server Development** | Visual interface for interactive testing and debugging | Scriptable commands for quick testing and CI/CD integration |
| **Tool Testing** | Form-based parameter input with real-time response visualization | Command-line tool execution with JSON output for scripting |
| **Debugging** | Request history, visualized errors, and real-time notifications | Direct JSON output for log analysis |
| **Automation** | Not suitable | Ideal for batch processing and integration with coding assistants |
| **Learning MCP** | Rich visual interface helps understand server capabilities | Simplified commands for focused learning of specific endpoints |

## Transport Types

Our server uses **SSE (Server-Sent Events)** transport. The inspector supports three transport types:

1. **STDIO**: For local processes (not used by our server)
2. **SSE**: For server-sent events (our transport type)
3. **Streamable HTTP**: For HTTP-based transport

## Usage Examples

### UI Mode

1. **Basic connection:**
   ```bash
   npx @modelcontextprotocol/inspector http://localhost:8787/sse
   ```

2. **With query parameters:**
   ```
   http://localhost:6274/?transport=sse&serverUrl=http://localhost:8787/sse
   ```

### CLI Mode

1. **List available tools:**
   ```bash
   npx @modelcontextprotocol/inspector --cli http://localhost:8787/sse --method tools/list
   ```

2. **Submit a workflow:**
   ```bash
   npx @modelcontextprotocol/inspector --cli http://localhost:8787/sse \
     --method tools/call \
     --tool-name submitWorkflow \
     --tool-arg prompt="beautiful sunset over mountains"
   ```

3. **Check job status:**
   ```bash
   npx @modelcontextprotocol/inspector --cli http://localhost:8787/sse \
     --method tools/call \
     --tool-name getJobStatus \
     --tool-arg prompt_id="YOUR_PROMPT_ID"
   ```

4. **Get job history:**
   ```bash
   npx @modelcontextprotocol/inspector --cli http://localhost:8787/sse \
     --method tools/call \
     --tool-name getJobHistory \
     --tool-arg limit=10
   ```

5. **Health check:**
   ```bash
   npx @modelcontextprotocol/inspector --cli http://localhost:8787/sse \
     --method tools/call \
     --tool-name healthCheck
   ```

## Configuration Files

Save server configurations for easy reuse:

### Example: `mcp-config.json`
```json
{
  "mcpServers": {
    "comfyui-local": {
      "type": "sse",
      "url": "http://localhost:8787/sse"
    },
    "comfyui-prod": {
      "type": "sse",
      "url": "https://your-production-url.com/sse"
    }
  }
}
```

### Usage:
```bash
# Use local server
npx @modelcontextprotocol/inspector --config mcp-config.json --server comfyui-local

# Use production server
npx @modelcontextprotocol/inspector --config mcp-config.json --server comfyui-prod
```

## Environment Variables

The inspector supports various configuration options via environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `MCP_SERVER_REQUEST_TIMEOUT` | Request timeout in milliseconds | 10000 |
| `MCP_REQUEST_TIMEOUT_RESET_ON_PROGRESS` | Reset timeout on progress notifications | true |
| `MCP_REQUEST_MAX_TOTAL_TIMEOUT` | Maximum total timeout for requests (ms) | 60000 |
| `MCP_AUTO_OPEN_ENABLED` | Auto-open browser when inspector starts | true |

### Example with environment variables:
```bash
MCP_SERVER_REQUEST_TIMEOUT=30000 npx @modelcontextprotocol/inspector http://localhost:8787/sse
```

## Development Workflow Tips

### 1. Rapid Testing with CLI
When developing with AI coding assistants like Cursor, use the CLI mode for rapid feedback:

```bash
# Create a test script
cat > test-workflow.sh << 'EOF'
#!/bin/bash
echo "Testing submitWorkflow..."
npx @modelcontextprotocol/inspector --cli http://localhost:8787/sse \
  --method tools/call --tool-name submitWorkflow \
  --tool-arg prompt="test prompt" | jq .

echo "Listing tools..."
npx @modelcontextprotocol/inspector --cli http://localhost:8787/sse \
  --method tools/list | jq .
EOF

chmod +x test-workflow.sh
./test-workflow.sh
```

### 2. Batch Testing
Test multiple scenarios quickly:

```bash
# Test different prompts
for prompt in "sunset" "mountain" "ocean"; do
  echo "Testing prompt: $prompt"
  npx @modelcontextprotocol/inspector --cli http://localhost:8787/sse \
    --method tools/call --tool-name submitWorkflow \
    --tool-arg prompt="$prompt"
done
```

### 3. Integration with CI/CD
Add inspector tests to your CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Test MCP Server
  run: |
    npm run dev &
    sleep 5
    npx @modelcontextprotocol/inspector --cli http://localhost:8787/sse --method tools/list
```

## Troubleshooting

1. **Connection refused**: Ensure the MCP server is running (`npm run dev`)
2. **Timeout errors**: Increase timeout via `MCP_SERVER_REQUEST_TIMEOUT`
3. **Transport errors**: Verify you're using the correct transport type (SSE)
4. **Tool not found**: Check tool names match exactly (case-sensitive)

## Additional Resources

- [Official MCP Inspector GitHub](https://github.com/modelcontextprotocol/inspector)
- [MCP Documentation](https://modelcontextprotocol.io/)
- [MCP Discord Community](https://discord.gg/mcp)
