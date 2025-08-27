# ComfyUI MCP Server

A stateful Model Context Protocol (MCP) server for ComfyUI, built with Cloudflare Workers and Durable Objects.

## Features

- **Stateful Job Management**: Tracks submitted workflows with persistent storage
- **Workflow Submission**: Submit ComfyUI workflows with optional prompt customization
- **Job Status Tracking**: Check the status of submitted jobs and retrieve results
- **Job History**: View all jobs submitted in the current session
- **Health Monitoring**: Check ComfyUI server connectivity

## Prerequisites

- Node.js 18+ and npm
- Cloudflare account (for deployment)
- Running ComfyUI instance
- Wrangler CLI (`npm install -g wrangler`)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   - Copy `.dev.vars.example` to `.dev.vars`
   - Update `COMFYUI_URL` with your ComfyUI instance URL

3. **Update workflow template:**
   - Edit `src/mcp-do.ts` and replace `DEFAULT_WORKFLOW` with your actual ComfyUI workflow JSON
   - Ensure the workflow has the appropriate input nodes for prompt text

## Development

Run the development server:
```bash
npm run dev
```

The server will be available at `http://localhost:8787`

Quick testing with inspector:
```bash
npm run inspect      # Opens web inspector
npm run inspect:cli  # Tests tools via CLI
```

## Testing with MCP Inspector

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) is the official visual testing tool for MCP servers.

### Option 1: Web Inspector (UI Mode)
Best for interactive testing and debugging during development:

1. Visit [https://mcp-inspector.mcp-servers.com/](https://mcp-inspector.mcp-servers.com/)
2. Enter your server URL: `http://localhost:8787/mcp` (StreamableHttp transport)
3. Click "Connect"

You can also use query parameters for initial configuration:
```
http://localhost:6274/?transport=streamable-http&serverUrl=http://localhost:8787/mcp
```

### Option 2: CLI Inspector
Best for scripting, automation, and rapid development feedback loops:

```bash
# Interactive UI mode (opens browser)
npx @modelcontextprotocol/inspector http://localhost:8787/mcp

# CLI mode for programmatic access
npx @modelcontextprotocol/inspector --cli http://localhost:8787/mcp --method tools/list

# Call a specific tool
npx @modelcontextprotocol/inspector --cli http://localhost:8787/mcp --method tools/call --tool-name submitWorkflow --tool-arg prompt="beautiful sunset"
```

### Transport Types
This server uses StreamableHttp transport. The inspector also supports:
- **STDIO**: For local processes
- **SSE**: For server-sent events (deprecated)
- **Streamable HTTP**: For HTTP-based transport (our case)

### Available Tools to Test
- `submitWorkflow` - Submit a new workflow with optional prompt
- `getJobStatus` - Check the status of a submitted job
- `getJobHistory` - List recent jobs from this session
- `healthCheck` - Verify ComfyUI server connectivity

### Inspector Configuration
The inspector supports various environment variables for configuration:
- `MCP_SERVER_REQUEST_TIMEOUT`: Request timeout in milliseconds (default: 10000)
- `MCP_REQUEST_TIMEOUT_RESET_ON_PROGRESS`: Reset timeout on progress notifications (default: true)
- `MCP_REQUEST_MAX_TOTAL_TIMEOUT`: Maximum total timeout for requests (default: 60000)

For comprehensive inspector usage, see [INSPECTOR_GUIDE.md](./INSPECTOR_GUIDE.md)

## Deployment

### Local ComfyUI Instance

1. **Set production secrets:**
   ```bash
   wrangler secret put COMFYUI_URL
   # Enter: http://your-local-ip:8188
   ```

2. **Deploy to Cloudflare:**
   ```bash
   npm run deploy
   ```

### Cloud ComfyUI Instance (Google Cloud/AWS/etc.)

When using a cloud-hosted ComfyUI instance, you need to configure network access for Cloudflare Workers:

#### 1. Static IP Configuration
Your ComfyUI instance needs a static external IP:

```bash
# Google Cloud example
gcloud compute addresses create comfyui-static-ip --region=your-region
gcloud compute addresses describe comfyui-static-ip --region=your-region
gcloud compute instances delete-access-config your-instance --zone=your-zone
gcloud compute instances add-access-config your-instance --zone=your-zone --address=[STATIC_IP]
```

#### 2. Firewall Rules for Cloudflare Access
Create a firewall rule allowing Cloudflare's IP ranges to access ComfyUI:

```bash
# Google Cloud example
gcloud compute firewall-rules create allow-cloudflare-comfyui \
  --allow tcp:8188 \
  --source-ranges="173.245.48.0/20,103.21.244.0/22,103.22.200.0/22,103.31.4.0/22,141.101.64.0/18,108.162.192.0/18,190.93.240.0/20,188.114.96.0/20,197.234.240.0/22,198.41.128.0/17,162.158.0.0/15,104.16.0.0/13,104.24.0.0/14,172.64.0.0/13,131.0.72.0/22" \
  --target-tags=comfyui-server \
  --description="Allow Cloudflare Workers to access ComfyUI"

gcloud compute instances add-tags your-instance --zone=your-zone --tags=comfyui-server
```

#### 3. Update Production Configuration
```bash
wrangler secret put COMFYUI_URL
# Enter: http://[STATIC_IP]:8188
```

> **Important:** Cloud notebook services (like Google Colab, Jupyter notebooks with proxy URLs) require authentication and cannot be accessed directly by Cloudflare Workers. You need a dedicated compute instance with proper network configuration.

## Available Tools

### submitWorkflow
Submit a workflow to ComfyUI for processing.
- Parameters:
  - `prompt` (optional): Text prompt to use in the workflow

### getJobStatus
Check the status of a submitted job.
- Parameters:
  - `prompt_id`: The ID returned from submitWorkflow

### getJobHistory
Retrieve the list of jobs submitted in this session.
- Parameters:
  - `limit` (optional): Maximum number of jobs to return (default: 10)

### healthCheck
Check if ComfyUI server is accessible and healthy.

## Architecture

This server follows the recommended Cloudflare MCP architecture:
- `src/index.ts`: Simple router that forwards requests to the Durable Object
- `src/mcp-do.ts`: Durable Object containing all MCP logic and state management
- Uses `this.state.storage` for persistent job storage
- Implements proper error handling and input validation with Zod

## Security

- All tool inputs are validated using Zod schemas
- Environment variables are used for sensitive configuration
- Error messages are sanitized to prevent information leakage
- CORS is handled appropriately for browser-based clients

## Development Workflow

1. Create a feature branch from `main`
2. Make changes following the existing patterns
3. Format code: `npm run format`
4. Test with MCP Inspector
5. Commit with conventional messages (feat:, fix:, etc.)
6. Open a pull request for review
