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
    process.env.SPRITZ_API_BASE_URL = "https://sandbox.spritz.finance";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  it("throws with broker guidance if SPRITZ_API_KEY is missing", () => {
    delete process.env.SPRITZ_API_KEY;
    expect(() => new SpritzClient()).toThrow("spritz auth mcp");
  });

  it("throws if SPRITZ_API_KEY is empty string", () => {
    process.env.SPRITZ_API_KEY = "";
    expect(() => new SpritzClient()).toThrow("spritz auth mcp");
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

  it("sets User-Agent header", async () => {
    const fetch = mockFetch(200, { ok: true });
    globalThis.fetch = fetch;

    const client = new SpritzClient();
    await client.request("GET", "/v1/test");

    const [, opts] = fetch.mock.calls[0];
    expect(opts.headers["User-Agent"]).toBe("spritz-mcp-server/0.3.2");
  });

  it("sets Origin header", async () => {
    const fetch = mockFetch(200, { ok: true });
    globalThis.fetch = fetch;

    const client = new SpritzClient();
    await client.request("GET", "/v1/test");

    const [, opts] = fetch.mock.calls[0];
    expect(opts.headers.Origin).toBe("https://mcp.spritz.finance");
  });

  it("sets session-id header as UUID", async () => {
    const fetch = mockFetch(200, { ok: true });
    globalThis.fetch = fetch;

    const client = new SpritzClient();
    await client.request("GET", "/v1/test");

    const [, opts] = fetch.mock.calls[0];
    expect(opts.headers["session-id"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("reuses same session-id across requests", async () => {
    const fetch = mockFetch(200, { ok: true });
    globalThis.fetch = fetch;

    const client = new SpritzClient();
    await client.request("GET", "/v1/a");
    await client.request("GET", "/v1/b");

    const id1 = fetch.mock.calls[0][1].headers["session-id"];
    const id2 = fetch.mock.calls[1][1].headers["session-id"];
    expect(id1).toBe(id2);
  });

  it("rotates session-id after 15 minutes", async () => {
    const fetch = mockFetch(200, { ok: true });
    globalThis.fetch = fetch;

    const client = new SpritzClient();
    await client.request("GET", "/v1/a");
    const id1 = fetch.mock.calls[0][1].headers["session-id"];

    vi.useFakeTimers();
    vi.advanceTimersByTime(15 * 60 * 1000);

    await client.request("GET", "/v1/b");
    const id2 = fetch.mock.calls[1][1].headers["session-id"];

    expect(id2).not.toBe(id1);
    expect(id2).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );

    vi.useRealTimers();
  });

  it("makes GET request without body", async () => {
    const fetch = mockFetch(200, [{ id: "ba_1" }]);
    globalThis.fetch = fetch;

    const client = new SpritzClient();
    const result = await client.request("GET", "/v1/bank-accounts/");

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe("https://sandbox.spritz.finance/v1/bank-accounts/");
    expect(opts.method).toBe("GET");
    expect(opts.redirect).toBe("error");
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

  it("throws on non-OK response without copying the response body", async () => {
    const fetch = mockFetch(
      401,
      "sensitive upstream diagnostic: account 123456789",
      "Unauthorized",
    );
    globalThis.fetch = fetch;

    const client = new SpritzClient();
    const error = await client.request("GET", "/v1/test").catch((reason) => reason);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/401 Unauthorized/);
    expect((error as Error).message).not.toMatch(/account 123456789/);
  });
});
