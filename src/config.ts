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
    name: "get_off_ramp_quote",
    operationId: "getV1Off-ramp-quotesByQuoteId",
    description: "Get an off-ramp quote by ID. Use this to check quote status or re-fetch quote details.",
    format: "json",
  },
  {
    name: "create_off_ramp_quote",
    operationId: "postV1Off-ramp-quotes",
    description: `Create an off-ramp quote to convert crypto to fiat. Returns a quote with locked exchange rate, fees, and next steps.

After creating a quote, check the \`fulfillment\` field:
- \`send_to_address\`: Send the exact \`input.amount\` of \`input.token\` to the \`sendTo.address\` before \`sendTo.expiresAt\`.
- \`sign_transaction\`: A pre-built transaction is available via the build transaction endpoint — sign and broadcast it.

Amount modes: set \`amountType\` to \`output\` (default) for exact fiat delivery, or \`input\` for exact crypto spend.`,
    format: "json",
  },
];
