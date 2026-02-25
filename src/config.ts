/**
 * Which OpenAPI operations to expose as MCP tools.
 *
 * To add a new tool: add an entry here with the operationId from openapi.json.
 * The inputSchema and HTTP details are derived from the spec automatically.
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
}

export const EXPOSED_TOOLS: ToolConfig[] = [
  {
    name: "list_bank_accounts",
    operationId: "getV1Bank-accounts",
    description: "List all bank accounts saved as off-ramp payment destinations.",
  },
  {
    name: "create_bank_account",
    operationId: "postV1Bank-accounts",
    description: "Add a new bank account as an off-ramp destination. The `type` field determines required fields: us (routing_number, account_number), ca (institution_number, transit_number, account_number), uk (sort_code, account_number), iban (iban, optional bic).",
    format: "json",
  },
  {
    name: "delete_bank_account",
    operationId: "deleteV1Bank-accountsByAccountId",
    description: "Delete a bank account by ID.",
  },
  {
    name: "list_off_ramps",
    operationId: "getV1Off-ramps",
    description: "List off-ramp transactions. Filter by status, chain, or destination accountId. Supports cursor pagination.",
  },
  {
    name: "create_off_ramp_quote",
    operationId: "postV1Off-ramp-quotes",
    description: "Create an off-ramp quote to convert crypto to fiat. Specify the destination accountId, amount, and blockchain chain. Returns a quote with exchange rate and fees.",
    format: "json",
  },
];
