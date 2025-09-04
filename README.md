d# ComfyUI MCP Server

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
This server uses **Streamable HTTP** transport by default. The inspector also supports:
- **STDIO**: For local processes
- **SSE**: Legacy server-sent events (supported for backward compatibility)
- **Streamable HTTP**: HTTP-based transport (default)

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

**CRITICAL:** Cloudflare Workers require HTTPS for external requests. ComfyUI runs on HTTP by default, so you need HTTPS termination.

**Network Requirements:**
- **Static IP address** (required for reliable connectivity)
- **HTTPS endpoint** (Cloudflare Workers cannot make HTTP requests)
- **No authentication barriers** for HTTP requests

**What Works:**
- ✅ Dedicated compute instances (Google Workbench, AWS EC2, etc.) with static IPs
- ✅ VMs with proper network configuration
- ✅ Self-hosted servers with public IPs

**What Doesn't Work:**
- ❌ Dynamic IP services (Google Colab, temporary notebooks)
- ❌ Services requiring authentication tokens for basic HTTP access
- ❌ Cloud notebook services with proxy URLs and network restrictions

#### Option 1: Cloudflare Tunnel (Recommended - Free & Easy)

**Quick Setup:**
```bash
# On your cloud instance
curl -L https://github.com/cloudflare/cloudflare/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Login and create tunnel
cloudflared tunnel login
cloudflared tunnel create comfyui

# Start tunnel (creates HTTPS endpoint automatically)
cloudflared tunnel --url http://localhost:8188
```

This gives you a free HTTPS URL like: `https://random-words-123.trycloudflare.com`

**Start ComfyUI:**
```bash
python main.py --listen 0.0.0.0 --port 8188
```

**Update secret:**
```bash
wrangler secret put COMFYUI_URL
# Enter: https://your-tunnel-url.trycloudflare.com
```

#### Option 2: Custom Domain + Reverse Proxy (Permanent Solution)

If you have a domain name, use Caddy for automatic HTTPS:

```bash
# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy

# Configure Caddyfile
echo "comfyui.yourdomain.com {
    reverse_proxy localhost:8188
}" | sudo tee /etc/caddy/Caddyfile

sudo systemctl reload caddy
```

#### Option 3: Manual HTTPS Setup (Advanced)

If you prefer manual configuration:

1. **Static IP + Firewall:**
```bash
# Google Cloud example
gcloud compute addresses create comfyui-static-ip --region=your-region
gcloud compute firewall-rules create allow-https-comfyui \
  --allow tcp:443,tcp:80 \
  --source-ranges="0.0.0.0/0" \
  --target-tags=comfyui-server
```

2. **Nginx + Let's Encrypt:**
```bash
sudo apt install nginx certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

> **Why HTTPS is Required:** Cloudflare Workers enforce security policies that block plain HTTP requests to external services. The 403 Forbidden errors you see are due to this HTTP restriction.

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
