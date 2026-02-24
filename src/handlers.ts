import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import type { SpritzClient } from "./index.js";
import type { ResolvedOperation } from "./spec.js";

/**
 * Generic handler that dispatches MCP tool calls to the Spritz API
 * based on resolved OpenAPI operations.
 */
export async function handleToolCall(
  request: CallToolRequest,
  operations: ResolvedOperation[],
  client: SpritzClient,
) {
  const { name, arguments: args } = request.params;

  const op = operations.find((o) => o.config.name === name);
  if (!op) {
    return {
      content: [{ type: "text" as const, text: `Error: Unknown tool "${name}"` }],
      isError: true,
    };
  }

  try {
    // Substitute path parameters, e.g. /v1/bank-accounts/{accountId}
    let path = op.path;
    const queryParams: Record<string, string> = {};
    const bodyParams: Record<string, unknown> = {};

    // Separate args into path params, query params, and body params
    const pathParamNames = [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);

    for (const [key, value] of Object.entries(args ?? {})) {
      if (pathParamNames.includes(key)) {
        path = path.replace(`{${key}}`, encodeURIComponent(String(value)));
      } else if (op.method === "get" || op.method === "delete") {
        queryParams[key] = String(value);
      } else {
        bodyParams[key] = value;
      }
    }

    // Build query string for GET/DELETE
    const qs = new URLSearchParams(queryParams).toString();
    if (qs) path = `${path}?${qs}`;

    // Make the request
    const result = await client.request(
      op.method.toUpperCase(),
      path,
      Object.keys(bodyParams).length > 0 ? bodyParams : undefined,
    );

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text" as const, text: `Error: ${message}` }],
      isError: true,
    };
  }
}
