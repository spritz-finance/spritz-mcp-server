import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SpritzClient } from "../client.js";

// ============================================================================
// Helpers
// ============================================================================

function mockFetch(
  status: number,
  body: unknown,
  statusText = "OK",
): ReturnType<typeof vi.fn> {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  }));
}

// ============================================================================
// Tests
// ============================================================================

describe("SpritzClient", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.SPRITZ_API_KEY = "test-api-key";
    process.env.SPRITZ_API_BASE_URL = "https://test.spritz.finance";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  it("throws if SPRITZ_API_KEY is missing", () => {
    delete process.env.SPRITZ_API_KEY;
    expect(() => new SpritzClient()).toThrow("SPRITZ_API_KEY must be set");
  });

  it("throws if SPRITZ_API_KEY is empty string", () => {
    process.env.SPRITZ_API_KEY = "";
    expect(() => new SpritzClient()).toThrow("SPRITZ_API_KEY must be set");
  });

  it("sets Authorization header with Bearer token", async () => {
    const fetch = mockFetch(200, { ok: true });
    globalThis.fetch = fetch;

    const client = new SpritzClient();
    await client.request("GET", "/v1/test");

    const [, opts] = fetch.mock.calls[0];
    expect(opts.headers.Authorization).toBe("Bearer test-api-key");
  });

  it("sets Content-Type: application/json", async () => {
    const fetch = mockFetch(200, { ok: true });
    globalThis.fetch = fetch;

    const client = new SpritzClient();
    await client.request("GET", "/v1/test");

    const [, opts] = fetch.mock.calls[0];
    expect(opts.headers["Content-Type"]).toBe("application/json");
  });

  it("makes GET request without body", async () => {
    const fetch = mockFetch(200, [{ id: "ba_1" }]);
    globalThis.fetch = fetch;

    const client = new SpritzClient();
    const result = await client.request("GET", "/v1/bank-accounts/");

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe("https://test.spritz.finance/v1/bank-accounts/");
    expect(opts.method).toBe("GET");
    expect(opts.body).toBeUndefined();
    expect(result).toEqual([{ id: "ba_1" }]);
  });

  it("makes POST request with JSON body", async () => {
    const fetch = mockFetch(201, { id: "pr_1" });
    globalThis.fetch = fetch;

    const client = new SpritzClient();
    await client.request("POST", "/v1/payment-requests/", {
      accountId: "ba_1",
      amount: "100.00",
    });

    const [, opts] = fetch.mock.calls[0];
    expect(opts.method).toBe("POST");
    expect(opts.body).toBe(
      JSON.stringify({ accountId: "ba_1", amount: "100.00" }),
    );
  });

  it("throws on non-OK response with status and body", async () => {
    const fetch = mockFetch(401, "Unauthorized", "Unauthorized");
    globalThis.fetch = fetch;

    const client = new SpritzClient();

    await expect(client.request("GET", "/v1/test")).rejects.toThrow(
      /401 Unauthorized/,
    );
  });

  it("uses default base URL when SPRITZ_API_BASE_URL not set", async () => {
    delete process.env.SPRITZ_API_BASE_URL;
    const fetch = mockFetch(200, {});
    globalThis.fetch = fetch;

    const client = new SpritzClient();
    await client.request("GET", "/v1/test");

    const [url] = fetch.mock.calls[0];
    expect(url).toBe("https://platform.spritz.finance/v1/test");
  });
});
