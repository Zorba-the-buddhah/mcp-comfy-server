import { McpDurableObject } from "./mcp-do";

// Export the Durable Object class for the runtime
export { McpDurableObject };

/**
 * Main worker entrypoint - acts as a simple router
 * Following the pattern from mcp-examples
 */
export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Initialize props for McpAgent (required by the agents library)
		// Even if we don't use specific props, the framework expects this to be set
		(ctx as any).props = {};

		// Handle MCP StreamableHttp endpoints (preferred)
		if (url.pathname === "/mcp" || url.pathname.startsWith("/mcp/")) {
			return McpDurableObject.serve("/mcp").fetch(request, env, ctx);
		}

		// Handle legacy SSE endpoints (deprecated but still supported)
		if (url.pathname === "/sse" || url.pathname.startsWith("/sse/")) {
			return McpDurableObject.serveSSE("/sse").fetch(request, env, ctx);
		}

		// Default response
		return new Response(
			JSON.stringify({
				message: "ComfyUI MCP Server",
				version: "1.0.0",
				endpoints: {
					streamableHttp: "/mcp",
					sse: "/sse (deprecated)",
				},
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	},
} satisfies ExportedHandler<Env>;
