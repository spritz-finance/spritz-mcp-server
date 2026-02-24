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

dotenv.config();

// ============================================================================
// API Client
// ============================================================================

export class SpritzClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.SPRITZ_API_KEY || "";
    this.baseUrl =
      process.env.SPRITZ_API_BASE_URL || "https://api.spritz.finance";

    if (!this.apiKey) {
      throw new Error("SPRITZ_API_KEY must be set in environment variables");
    }
  }

  async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ) {
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Spritz API error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    return response.json();
  }
}

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
