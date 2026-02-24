import { describe, it, expect, vi } from "vitest";
import { handleToolCall } from "../handlers.js";
import type { ResolvedOperation } from "../spec.js";
import type { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";

// ============================================================================
// Helpers
// ============================================================================

function makeClient(
  impl: (
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ) => Promise<unknown> = async () => ({ ok: true }),
) {
  return { request: vi.fn(impl) };
}

function makeRequest(name: string, args?: Record<string, unknown>): CallToolRequest {
  return {
    method: "tools/call",
    params: { name, arguments: args },
  };
}

const listOp: ResolvedOperation = {
  method: "get",
  path: "/v1/bank-accounts/",
  inputSchema: { type: "object", properties: {}, required: [] },
  config: {
    name: "list_bank_accounts",
    operationId: "getV1Bank-accounts",
    description: "List bank accounts",
  },
  summary: "List bank accounts",
};

const getByIdOp: ResolvedOperation = {
  method: "get",
  path: "/v1/bank-accounts/{accountId}",
  inputSchema: {
    type: "object",
    properties: { accountId: { type: "string" } },
    required: ["accountId"],
  },
  config: {
    name: "get_bank_account",
    operationId: "getV1Bank-accountsByAccountId",
  },
  summary: "Get a bank account",
};

const createOp: ResolvedOperation = {
  method: "post",
  path: "/v1/payment-requests/",
  inputSchema: {
    type: "object",
    properties: {
      accountId: { type: "string" },
      amount: { type: "string" },
    },
    required: ["accountId", "amount"],
  },
  config: {
    name: "create_payment",
    operationId: "postV1Payment-requests",
  },
  summary: "Create a payment request",
};

const ratesOp: ResolvedOperation = {
  method: "get",
  path: "/v1/on-ramps/exchange-rates",
  inputSchema: {
    type: "object",
    properties: { from: { type: "string" }, to: { type: "string" } },
    required: ["from", "to"],
  },
  config: {
    name: "get_exchange_rates",
    operationId: "getV1On-rampsExchange-rates",
  },
  summary: "Get exchange rates",
};

const allOps = [listOp, getByIdOp, createOp, ratesOp];

// ============================================================================
// Tests
// ============================================================================

describe("handleToolCall", () => {
  it("routes to the correct operation by tool name", async () => {
    const client = makeClient(async () => [{ id: "ba_1" }]);
    const result = await handleToolCall(
      makeRequest("list_bank_accounts"),
      allOps,
      client,
    );

    expect(result.isError).toBeUndefined();
    expect(client.request).toHaveBeenCalledWith("GET", "/v1/bank-accounts/", undefined);
  });

  it("returns error for unknown tool name", async () => {
    const client = makeClient();
    const result = await handleToolCall(
      makeRequest("nonexistent_tool"),
      allOps,
      client,
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool "nonexistent_tool"');
  });

  it("substitutes path params with URL encoding", async () => {
    const client = makeClient(async () => ({ id: "ba_1" }));
    await handleToolCall(
      makeRequest("get_bank_account", { accountId: "ba_abc/123" }),
      allOps,
      client,
    );

    expect(client.request).toHaveBeenCalledWith(
      "GET",
      "/v1/bank-accounts/ba_abc%2F123",
      undefined,
    );
  });

  it("sends GET args as query string", async () => {
    const client = makeClient(async () => ({ rate: "1.0012" }));
    await handleToolCall(
      makeRequest("get_exchange_rates", { from: "USD", to: "USDT" }),
      allOps,
      client,
    );

    expect(client.request).toHaveBeenCalledWith(
      "GET",
      "/v1/on-ramps/exchange-rates?from=USD&to=USDT",
      undefined,
    );
  });

  it("sends POST args as JSON body", async () => {
    const client = makeClient(async () => ({ id: "pr_1" }));
    await handleToolCall(
      makeRequest("create_payment", { accountId: "ba_1", amount: "100.00" }),
      allOps,
      client,
    );

    expect(client.request).toHaveBeenCalledWith(
      "POST",
      "/v1/payment-requests/",
      { accountId: "ba_1", amount: "100.00" },
    );
  });

  it("returns error response on API failure", async () => {
    const client = makeClient(async () => {
      throw new Error("Spritz API error: 401 Unauthorized - Invalid token");
    });

    const result = await handleToolCall(
      makeRequest("list_bank_accounts"),
      allOps,
      client,
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("401 Unauthorized");
  });

  it("handles non-Error throws", async () => {
    const client = makeClient(async () => {
      throw "string error";
    });

    const result = await handleToolCall(
      makeRequest("list_bank_accounts"),
      allOps,
      client,
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Unknown error");
  });

  it("works with empty/undefined args for no-param tools", async () => {
    const client = makeClient(async () => []);
    const result = await handleToolCall(
      makeRequest("list_bank_accounts"),
      allOps,
      client,
    );

    expect(result.isError).toBeUndefined();
    expect(client.request).toHaveBeenCalledWith("GET", "/v1/bank-accounts/", undefined);
  });

  it("returns JSON-stringified result in content", async () => {
    const data = { id: "ba_1", status: "active" };
    const client = makeClient(async () => data);

    const result = await handleToolCall(
      makeRequest("list_bank_accounts"),
      allOps,
      client,
    );

    expect(JSON.parse(result.content[0].text)).toEqual(data);
  });
});
