import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { SpritzClient } from './index.js';
import {
  GetBankAccountsParamsSchema,
  GetBankAccountParamsSchema,
  CreateBankAccountParamsSchema,
  DeleteBankAccountParamsSchema,
  CreatePaymentParamsSchema,
  GetPaymentParamsSchema,
  GetPaymentsParamsSchema,
} from './schemas.js';

/**
 * Handle tool calls by routing to the appropriate SpritzClient method.
 */
export async function handleToolCall(
  request: CallToolRequest,
  spritzClient: SpritzClient,
) {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // ======================================================================
      // BANK ACCOUNT HANDLERS
      // ======================================================================
      case "get_bank_accounts": {
        GetBankAccountsParamsSchema.parse(args || {});
        const accounts = await spritzClient.getBankAccounts();
        return {
          content: [{ type: "text" as const, text: JSON.stringify(accounts, null, 2) }],
        };
      }

      case "get_bank_account": {
        const validated = GetBankAccountParamsSchema.parse(args);
        const account = await spritzClient.getBankAccount(validated.bank_account_id);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(account, null, 2) }],
        };
      }

      case "create_bank_account": {
        const validated = CreateBankAccountParamsSchema.parse(args);
        const account = await spritzClient.createBankAccount(validated);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(account, null, 2) }],
        };
      }

      case "delete_bank_account": {
        const validated = DeleteBankAccountParamsSchema.parse(args);
        const result = await spritzClient.deleteBankAccount(validated.bank_account_id);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      }

      // ======================================================================
      // PAYMENT HANDLERS
      // ======================================================================
      case "create_payment": {
        const validated = CreatePaymentParamsSchema.parse(args);
        const payment = await spritzClient.createPayment(validated);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(payment, null, 2) }],
        };
      }

      case "get_payment": {
        const validated = GetPaymentParamsSchema.parse(args);
        const payment = await spritzClient.getPayment(validated.payment_id);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(payment, null, 2) }],
        };
      }

      case "get_payments": {
        const validated = GetPaymentsParamsSchema.parse(args || {});
        const payments = await spritzClient.getPayments(validated);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(payments, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return {
      content: [{ type: "text" as const, text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
}
