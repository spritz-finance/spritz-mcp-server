#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { EXPOSED_TOOLS } from "./config.js";
import { loadSpec, resolveTools, toMcpTools } from "./spec.js";
import { handleToolCall } from "./handlers.js";
import { SpritzClient } from "./client.js";
import { resolveCredential } from "./credentials.js";
import { SERVER_VERSION } from "./version.js";

// ============================================================================
// Server
// ============================================================================

async function main() {
  let credential;
  try {
    credential = resolveCredential();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // Load OpenAPI spec and resolve selected operations
  const spec = loadSpec();
  const operations = resolveTools(spec, EXPOSED_TOOLS);
  const mcpTools = toMcpTools(operations);

  const client = new SpritzClient(credential);

  const server = new Server(
    { name: "spritz-mcp-server", version: SERVER_VERSION },
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
  console.error(
    `Spritz MCP Server is running read-only via stdio for an End User ${credential.environment} account with an explicitly injected environment credential`,
  );
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
