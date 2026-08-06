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
    name: "create_bank_account",
    operationId: "postV1Bank-accounts",
    description: "Add a bank account as an off-ramp destination after fresh human confirmation of the holder and masked destination details. The `type` field determines required fields: us (`routingNumber`, `accountNumber`), ca (`institutionNumber`, `transitNumber`, `accountNumber`), uk (`sortCode`, `accountNumber`), or iban (`iban`, optional `bic`).",
    format: "json",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: "delete_bank_account",
    operationId: "deleteV1Bank-accountsByAccountId",
    description: "Delete a bank destination by ID only after fresh human confirmation of the masked destination.",
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
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
  {
    name: "get_off_ramp_transaction",
    operationId: "postV1Off-ramp-quotesByQuoteIdTransaction",
    description: "Prepare transaction parameters for a quote after confirmation. Returns EVM calldata (`contractAddress`, `calldata`, `value`) or a serialized Solana transaction (`transactionSerialized`). This tool does not sign or submit; require fresh human confirmation of the returned payload before a separate wallet does either.",
    format: "json",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: "create_off_ramp_quote",
    operationId: "postV1Off-ramp-quotes",
    description: `Create an off-ramp quote to convert crypto to fiat only after fresh human confirmation of the environment, amount, mode, masked destination, rail, chain, token, and known fees. Requires accountId, amount, and chain. When tokenAddress is supplied, use the verified on-chain contract address rather than a token symbol.

After creating a quote, check the \`fulfillment\` field:
- \`send_to_address\`: Send the exact \`input.amount\` of \`input.token\` to the \`sendTo.address\` before \`sendTo.expiresAt\`.
- \`sign_transaction\`: Call \`get_off_ramp_transaction\` with the quote ID and sender address to get calldata or a serialized transaction, then sign and submit on-chain.

Amount modes: set \`amountMode\` to \`output\` (default) for exact fiat delivery, or \`input\` for exact crypto spend.`,
    format: "json",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
];
