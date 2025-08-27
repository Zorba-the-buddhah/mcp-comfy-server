import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import workflow from "./workflow.json";

// Define interfaces for ComfyUI responses and stored data
interface ComfyUIResponse {
	prompt_id: string;
	number: number;
}

interface JobHistory {
	outputs: {
		[key: string]: {
			images?: Array<{
				filename: string;
				subfolder?: string;
				type: string;
			}>;
		};
	};
}

interface StoredJob {
	prompt_id: string;
	status: "submitted" | "running" | "complete" | "failed";
	prompt_text?: string;
	created_at: string;
	result?: any;
}

/**
 * McpDurableObject handles all MCP logic and state management for ComfyUI
 * Following Phase 1 requirements: stateful foundation with job history
 */
export class McpDurableObject extends McpAgent<Env> {
	server = new McpServer({
		name: "ComfyUI MCP Server",
		version: "1.0.0",
	});

	async init() {
		// Tool: Submit a workflow to ComfyUI
		this.server.tool(
			"submitWorkflow",
			"Submit a workflow to ComfyUI for processing",
			{
				prompt: z.string().optional().describe("Optional prompt text to use in the workflow"),
			},
			async ({ prompt }) => {
				try {
					const url = `${this.env.COMFYUI_URL}/prompt`;

					// Clone the workflow and update prompt if provided
					const workflowToSubmit = { ...workflow };
					if (prompt && workflowToSubmit["45"]?.inputs) {
						(workflowToSubmit["45"].inputs as any).text = prompt;
					}

					// Submit to ComfyUI
					const response = await fetch(url, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ prompt: workflowToSubmit }),
					});

					if (!response.ok) {
						const error = await response.text();
						throw new Error(`Workflow submission failed: ${response.status}`);
					}

					const data = (await response.json()) as ComfyUIResponse;

					// Store job in Durable Object storage
					const job: StoredJob = {
						prompt_id: data.prompt_id,
						status: "submitted",
						prompt_text: prompt,
						created_at: new Date().toISOString(),
					};

					await this.ctx.storage.put(`job:${data.prompt_id}`, job);

					return {
						content: [
							{
								type: "text",
								text: `Workflow submitted successfully!\nPrompt ID: ${data.prompt_id}\nStatus: submitted`,
							},
						],
					};
				} catch (error) {
					// Sanitize error messages for security
					const message = error instanceof Error ? error.message : "Unknown error occurred";
					return {
						content: [
							{
								type: "text",
								text: `Error submitting workflow: ${message}`,
							},
						],
					};
				}
			},
		);

		// Tool: Get job status from ComfyUI
		this.server.tool(
			"getJobStatus",
			"Check the status of a submitted job",
			{
				prompt_id: z.string().describe("The prompt ID returned from submitWorkflow"),
			},
			async ({ prompt_id }) => {
				try {
					// Check our storage first
					const storedJob = await this.ctx.storage.get<StoredJob>(`job:${prompt_id}`);

					// If job is already complete, return cached result
					if (storedJob?.status === "complete" && storedJob.result) {
						return {
							content: [
								{
									type: "text",
									text: `Job Status: Complete\n${JSON.stringify(storedJob.result, null, 2)}`,
								},
							],
						};
					}

					// Query ComfyUI for current status
					const url = `${this.env.COMFYUI_URL}/history/${encodeURIComponent(prompt_id)}`;
					const response = await fetch(url);

					if (!response.ok) {
						throw new Error(`Failed to fetch job status: ${response.status}`);
					}

					const data = (await response.json()) as Record<string, JobHistory>;

					// Job not found in history means it's still running
					if (!data[prompt_id]) {
						return {
							content: [
								{
									type: "text",
									text: "Job Status: Running\nThe job is still being processed.",
								},
							],
						};
					}

					// Process completed job
					const history = data[prompt_id];
					const saveImageNode = Object.values(history.outputs).find((o) => o.images && o.images.length > 0);

					if (!saveImageNode?.images?.[0]) {
						throw new Error("No images found in job output");
					}

					const image = saveImageNode.images[0];
					const { filename, subfolder = "", type = "output" } = image;
					const fullPath = subfolder ? `${subfolder}/${filename}` : filename;

					// Build view URL
					const params = new URLSearchParams({ filename, type });
					if (subfolder) params.set("subfolder", subfolder);
					const viewUrl = `${this.env.COMFYUI_URL}/view?${params.toString()}`;

					const result = {
						status: "complete",
						filename,
						subfolder,
						type,
						fullPath,
						viewUrl,
					};

					// Update stored job with result
					if (storedJob) {
						await this.ctx.storage.put(`job:${prompt_id}`, {
							...storedJob,
							status: "complete",
							result,
						});
					}

					return {
						content: [
							{
								type: "text",
								text: `Job Status: Complete\n${JSON.stringify(result, null, 2)}`,
							},
						],
					};
				} catch (error) {
					const message = error instanceof Error ? error.message : "Unknown error occurred";
					return {
						content: [
							{
								type: "text",
								text: `Error checking job status: ${message}`,
							},
						],
					};
				}
			},
		);

		// Tool: Get job history for this session
		this.server.tool(
			"getJobHistory",
			"Retrieve the list of jobs submitted in this session",
			{
				limit: z.number().optional().default(10).describe("Maximum number of jobs to return"),
			},
			async ({ limit }) => {
				try {
					// List all jobs from storage
					const jobs = await this.ctx.storage.list<StoredJob>({
						prefix: "job:",
						limit,
						reverse: true, // Most recent first
					});

					const jobList: StoredJob[] = [];
					for (const [key, value] of jobs) {
						jobList.push(value);
					}

					return {
						content: [
							{
								type: "text",
								text: `Found ${jobList.length} jobs:\n${JSON.stringify(jobList, null, 2)}`,
							},
						],
					};
				} catch (error) {
					const message = error instanceof Error ? error.message : "Unknown error occurred";
					return {
						content: [
							{
								type: "text",
								text: `Error retrieving job history: ${message}`,
							},
						],
					};
				}
			},
		);

		// Tool: Health check for ComfyUI
		this.server.tool("healthCheck", "Check if ComfyUI server is accessible and healthy", {}, async () => {
			try {
				const response = await fetch(`${this.env.COMFYUI_URL}/system_stats`);
				const isHealthy = response.ok;

				let details = "";
				if (isHealthy) {
					try {
						const stats = await response.json();
						details = `\nSystem Stats: ${JSON.stringify(stats, null, 2)}`;
					} catch {
						details = "\nSystem stats available but could not parse response";
					}
				}

				return {
					content: [
						{
							type: "text",
							text: `ComfyUI Status: ${isHealthy ? "Healthy" : "Unhealthy"}${details}`,
						},
					],
				};
			} catch (error) {
				const message = error instanceof Error ? error.message : "Unknown error occurred";
				return {
					content: [
						{
							type: "text",
							text: `ComfyUI Status: Unreachable\nError: ${message}`,
						},
					],
				};
			}
		});
	}
}
