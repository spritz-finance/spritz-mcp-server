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
    name: "get_off_ramp_transaction",
    operationId: "postV1Off-ramp-quotesByQuoteIdTransaction",
    description: "Get transaction params for a quote. Returns EVM calldata (contractAddress, calldata, value) or a serialized Solana transaction (transactionSerialized) depending on the chain. The agent must sign and submit the transaction on-chain.",
    format: "json",
  },
  {
    name: "create_off_ramp_quote",
    operationId: "postV1Off-ramp-quotes",
    description: `Create an off-ramp quote to convert crypto to fiat. Requires accountId, amount, chain, and tokenAddress (the on-chain contract address, e.g. 0xaf88d065e77c8cC2239327C5EDb3A432268e5831 for USDC on Arbitrum). Do NOT pass a token symbol — it must be the contract address.

After creating a quote, check the \`fulfillment\` field:
- \`send_to_address\`: Send the exact \`input.amount\` of \`input.token\` to the \`sendTo.address\` before \`sendTo.expiresAt\`.
- \`sign_transaction\`: Call \`get_off_ramp_transaction\` with the quote ID and sender address to get calldata or a serialized transaction, then sign and submit on-chain.

Amount modes: set \`amountMode\` to \`output\` (default) for exact fiat delivery, or \`input\` for exact crypto spend.`,
    format: "json",
  },
];
