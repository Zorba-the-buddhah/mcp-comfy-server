# AGENTS.md

This document is the central charter for AI agents developing the MCP Comfy Server. It outlines our principles, architecture, and development roadmap.

## Guiding Principles

Our development is guided by a core philosophy: **"Follow best practices and keep things as simple as possible within."**

1.  **Emulate Proven Examples:** Our primary goal is to build a server that mirrors the quality and patterns of the official Cloudflare examples.
2.  **Phased Development:** We build in logical, iterative phases. Each phase has a clear goal and builds upon a stable foundation.
3.  **Robust Foundations:** We prioritize clean, well-documented, and testable code from the start.

---

## Primary Source for Code Patterns 🌟

**The most important guideline is this: all implementation choices, code structure, and patterns MUST be inspired by the official examples located in the `../mcp-examples` directory.**

Before writing any code, review the relevant examples in that folder (e.g., the Durable Object implementations, the router setup, tool definitions). Your task is to apply those proven patterns to our specific ComfyUI use case.

---

## Key References (Conceptual Background)

Use these links to understand the "why" behind the patterns you see in the code examples.

* **Official MCP Documentation:** [https://modelcontextprotocol.io/docs/getting-started/intro](https://modelcontextprotocol.io/docs/getting-started/intro)
* **Cloudflare MCP Server Guide:** [https://blog.cloudflare.com/remote-model-context-protocol-servers-mcp/](https://blog.cloudflare.com/remote-model-context-protocol-servers-mcp/)
* **MCP Inspector GitHub:** [https://github.com/modelcontextprotocol/inspector](https://github.com/modelcontextprotocol/inspector) - Official testing tool with UI and CLI modes

---

## Core Architecture

The server MUST follow the recommended two-part pattern for Cloudflare Durable Objects, as demonstrated in the `mcp-examples`.

* **`src/index.ts` (The Router):** A stateless entrypoint responsible for forwarding requests to the correct Durable Object instance.
* **`src/mcp-do.ts` (The State Machine):** The Durable Object class containing all MCP business logic, tool definitions, and state management.

---

## Development Phases

This project is structured into distinct phases. Focus exclusively on the current phase.

### Phase 1 (Current Focus): The Stateful Foundation

The goal is to refactor our proven stateless server into a robust, stateful architecture, mirroring the patterns in `mcp-examples`.

**Definition of Done for Phase 1:**
1.  The stateless logic is cleanly migrated into the `McpDurableObject` class.
2.  `src/index.ts` is implemented as a simple router, just like the examples.
3.  `submitWorkflow` securely persists a job record to `this.state.storage`.
4.  A new tool, `getJobHistory`, is added to retrieve the session's job list.
5.  The server is fully functional and testable with the MCP Inspector (both web and CLI).
6.  **Foundational best practices are in place:** input validation (Zod), secret management, and sanitized error messages.

### Phase 2 (Future Work): Hardening & Features
*This phase is NOT part of the current task.*
* **Security Hardening:** Rate limiting, encryption-at-rest.
* **User Management:** `login` primitive.
* **Advanced Job Management:** `listJobs`, `cleanupJobs`.

---

## Git Workflow (Mandatory)

1.  **Feature Branch:** Create a branch from `main` (e.g., `feature/stateful-job-history`).
2.  **Atomic Commits:** Make small, logical commits with conventional messages (e.g., `feat: add getJobHistory tool`).
3.  **Pull Request:** Open a PR on GitHub for review upon completion.

---

## Environment & Commands

* **Environment:** Use `.dev.vars` for `COMFYUI_URL` locally and `wrangler secret put` for production.
* **Install:** `npm install`
* **Develop:** `npx wrangler dev`
* **Format:** `npm run format`
* **Deploy:** `npm run deploy`

## Testing Procedures

1. **For Remote ComfyUI:** Set up SSH tunnel first: `gcloud compute ssh INSTANCE --project PROJECT --zone ZONE -- -L 8188:localhost:8188`
2. **Start MCP Server:** `npm run dev`
3. **Test with Inspector:** 
   - **Web UI:** https://mcp-inspector.mcp-servers.com/ - Best for interactive debugging
   - **CLI Mode:** `npx @modelcontextprotocol/inspector --cli http://localhost:8787/sse` - Best for rapid development feedback loops with AI coding assistants

**Pro Tip:** The CLI mode is particularly useful when developing with AI coding assistants like Cursor, as it enables scriptable testing and creates efficient feedback loops for rapid iteration.