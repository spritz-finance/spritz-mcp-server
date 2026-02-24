#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import { EXPOSED_TOOLS } from "./config.js";
import { loadSpec, resolveTools, toMcpTools } from "./spec.js";
import { handleToolCall } from "./handlers.js";
import { SpritzClient } from "./client.js";

dotenv.config();

export { SpritzClient } from "./client.js";

// ============================================================================
// Server
// ============================================================================

async function main() {
  if (!process.env.SPRITZ_API_KEY) {
    console.error("Missing SPRITZ_API_KEY in environment variables.");
    console.error(
      "Create a .env file based on .env.example with your Spritz API key.",
    );
    process.exit(1);
  }

  // Load OpenAPI spec and resolve selected operations
  const spec = loadSpec();
  const operations = resolveTools(spec, EXPOSED_TOOLS);
  const mcpTools = toMcpTools(operations);

  const client = new SpritzClient();

  const server = new Server(
    { name: "spritz-mcp-server", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: mcpTools,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    handleToolCall(request, operations, client),
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Spritz MCP Server is running via stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
