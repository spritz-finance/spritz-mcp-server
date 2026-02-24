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
  },
];
