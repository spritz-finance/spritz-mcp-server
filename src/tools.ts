/**
 * Returns all tool definitions for the Spritz MCP server.
 *
 * TODO: Update tool descriptions and schemas once Spritz API is finalized.
 */
export function getAllTools() {
  return [
    // ========================================================================
    // BANK ACCOUNT TOOLS
    // ========================================================================
    {
      name: "get_bank_accounts",
      description: "List all saved bank account destinations for off-ramp payments.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "get_bank_account",
      description: "Retrieve details for a specific bank account by ID. Returns masked account/routing numbers (last 4 digits only).",
      inputSchema: {
        type: "object",
        properties: {
          bank_account_id: {
            type: "string",
            description: "The bank account ID to retrieve",
          },
        },
        required: ["bank_account_id"],
      },
    },
    {
      name: "create_bank_account",
      description: "Add a new bank account as a payment destination for off-ramp transfers. Requires routing number, account number, and account type.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Friendly label for this bank account (e.g. 'Primary checking')",
          },
          routing_number: {
            type: "string",
            description: "9-digit ABA routing number",
          },
          account_number: {
            type: "string",
            description: "Bank account number",
          },
          account_type: {
            type: "string",
            description: "Type of bank account",
            enum: ["checking", "savings"],
          },
        },
        required: ["name", "routing_number", "account_number", "account_type"],
      },
    },
    {
      name: "delete_bank_account",
      description: "Remove a saved bank account destination. Cannot delete accounts with in-flight payments.",
      inputSchema: {
        type: "object",
        properties: {
          bank_account_id: {
            type: "string",
            description: "The bank account ID to delete",
          },
        },
        required: ["bank_account_id"],
      },
    },

    // ========================================================================
    // PAYMENT TOOLS
    // ========================================================================
    {
      name: "create_payment",
      description: "Create an off-ramp payment to convert crypto to fiat and deliver USD to a bank account. Returns a deposit address where the agent must send crypto.",
      inputSchema: {
        type: "object",
        properties: {
          bank_account_id: {
            type: "string",
            description: "ID of the destination bank account",
          },
          amount_usd: {
            type: "string",
            description: "USD amount to deliver to the bank account (e.g. '100.00')",
          },
          network: {
            type: "string",
            description: "Blockchain network to pay from",
            enum: ["ethereum", "base", "polygon", "arbitrum", "optimism", "avalanche", "bsc"],
          },
          token: {
            type: "string",
            description: "Token to pay with",
            enum: ["USDC", "USDT", "DAI"],
          },
        },
        required: ["bank_account_id", "amount_usd", "network", "token"],
      },
    },
    {
      name: "get_payment",
      description: "Check the status of a specific payment by ID. Returns current status, deposit details, and bank account destination.",
      inputSchema: {
        type: "object",
        properties: {
          payment_id: {
            type: "string",
            description: "The payment ID to check",
          },
        },
        required: ["payment_id"],
      },
    },
    {
      name: "get_payments",
      description: "List payment history with optional status filter.",
      inputSchema: {
        type: "object",
        properties: {
          status: {
            type: "string",
            description: "Filter by payment status",
            enum: ["awaiting_deposit", "deposit_received", "converting", "sending", "completed", "expired", "failed"],
          },
          limit: {
            type: "integer",
            description: "Max results to return (default 25, max 100)",
            maximum: 100,
          },
          offset: {
            type: "integer",
            description: "Pagination offset",
          },
        },
        required: [],
      },
    },
  ];
}
