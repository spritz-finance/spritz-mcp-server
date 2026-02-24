import { z } from "zod";

// ==========================================================================
// BANK ACCOUNT SCHEMAS
// ==========================================================================

export const GetBankAccountsParamsSchema = z.object({});

export const GetBankAccountParamsSchema = z.object({
  bank_account_id: z.string().min(1, { message: "Bank account ID is required" }),
});

export const CreateBankAccountParamsSchema = z.object({
  name: z.string().min(1).max(100).describe("Friendly label for the bank account"),
  routing_number: z.string().length(9, { message: "Routing number must be exactly 9 digits" }),
  account_number: z.string().min(4).max(17).describe("Bank account number"),
  account_type: z.enum(["checking", "savings"]).describe("Type of bank account"),
});

export const DeleteBankAccountParamsSchema = z.object({
  bank_account_id: z.string().min(1, { message: "Bank account ID is required" }),
});

// ==========================================================================
// PAYMENT SCHEMAS
// ==========================================================================

export const CreatePaymentParamsSchema = z.object({
  bank_account_id: z.string().min(1).describe("ID of the destination bank account"),
  amount_usd: z.string().min(1).describe("USD amount to deliver (e.g. '100.00')"),
  network: z.string().min(1).describe("Blockchain network (e.g. 'base', 'ethereum', 'polygon')"),
  token: z.string().min(1).describe("Token to pay with (e.g. 'USDC', 'USDT')"),
});

export const GetPaymentParamsSchema = z.object({
  payment_id: z.string().min(1, { message: "Payment ID is required" }),
});

export const GetPaymentsParamsSchema = z.object({
  status: z.string().optional().describe("Filter by payment status"),
  limit: z.number().int().max(100).optional().describe("Max results to return"),
  offset: z.number().int().optional().describe("Pagination offset"),
});
