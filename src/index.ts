#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import dotenv from 'dotenv';
import { getAllTools } from './tools.js';
import { handleToolCall } from './handlers.js';

dotenv.config();

export class SpritzClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.SPRITZ_API_KEY || '';
    this.baseUrl = process.env.SPRITZ_API_BASE_URL || 'https://api.spritz.finance/v1';

    if (!this.apiKey) {
      throw new Error('SPRITZ_API_KEY must be set in environment variables');
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const headers = {
      ...this.getHeaders(),
      ...(options.headers as Record<string, string> || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Spritz API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  // ==========================================================================
  // BANK ACCOUNT METHODS
  // ==========================================================================

  async getBankAccounts() {
    return this.makeRequest('/bank-accounts');
  }

  async getBankAccount(bankAccountId: string) {
    return this.makeRequest(`/bank-accounts/${bankAccountId}`);
  }

  async createBankAccount(payload: {
    name: string;
    routing_number: string;
    account_number: string;
    account_type: 'checking' | 'savings';
  }) {
    return this.makeRequest('/bank-accounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deleteBankAccount(bankAccountId: string) {
    return this.makeRequest(`/bank-accounts/${bankAccountId}`, {
      method: 'DELETE',
    });
  }

  // ==========================================================================
  // PAYMENT METHODS
  // ==========================================================================

  async createPayment(payload: {
    bank_account_id: string;
    amount_usd: string;
    network: string;
    token: string;
  }) {
    return this.makeRequest('/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getPayment(paymentId: string) {
    return this.makeRequest(`/payments/${paymentId}`);
  }

  async getPayments(params?: { status?: string; limit?: number; offset?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const query = queryParams.toString();
    return this.makeRequest(`/payments${query ? `?${query}` : ''}`);
  }
}

/**
 * Create and configure the MCP Server
 */
async function createSpritzMcpServer() {
  const server = new Server(
    {
      name: "spritz-mcp-server",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const spritzClient = new SpritzClient();

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: getAllTools(),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return handleToolCall(request, spritzClient);
  });

  return server;
}

async function main() {
  const apiKey = process.env.SPRITZ_API_KEY;

  if (!apiKey) {
    console.error("Missing SPRITZ_API_KEY in environment variables.");
    console.error("Create a .env file based on .env.example with your Spritz API key.");
    process.exit(1);
  }

  try {
    const server = await createSpritzMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Spritz MCP Server is running via stdio");
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
