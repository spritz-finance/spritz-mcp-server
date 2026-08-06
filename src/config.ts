/**
 * Which OpenAPI operations to expose as MCP tools.
 *
 * Only read-only GET operations belong here until the server can verify an
 * action-bound human approval grant. The handler independently rejects every
 * non-GET operation if this allowlist regresses.
 */

export interface ToolConfig {
  /** MCP tool name (what the AI agent sees) */
  name: string;
  /** operationId from the OpenAPI spec */
  operationId: string;
  /** Override the spec's summary/description */
  description?: string;
  /** Response format — CSV saves tokens on list responses, JSON for nested single objects */
  format?: "csv" | "json";
  /** Standard MCP hints. These describe effects but never replace authorization. */
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
}

export const EXPOSED_TOOLS: ToolConfig[] = [
  {
    name: "list_bank_accounts",
    operationId: "getV1Bank-accounts",
    description: "List masked bank accounts saved as off-ramp payment destinations.",
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "list_off_ramps",
    operationId: "getV1Off-ramps",
    description: "List off-ramp transactions. Filter by status, chain, or destination accountId. Supports cursor pagination.",
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "get_off_ramp_quote",
    operationId: "getV1Off-ramp-quotesByQuoteId",
    description: "Get an off-ramp quote by ID. Use this to check quote status or re-fetch quote details.",
    format: "json",
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
];
