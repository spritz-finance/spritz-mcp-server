import { describe, it, expect } from "vitest";
import { formatCsv } from "../formatters.js";

describe("formatCsv", () => {
  it("formats a flat array as header + rows", () => {
    const data = [
      { id: "1", name: "Alice", status: "active" },
      { id: "2", name: "Bob", status: "pending" },
    ];

    expect(formatCsv(data)).toBe(
      "id,name,status\n1,Alice,active\n2,Bob,pending",
    );
  });

  it("flattens nested objects with dot-delimited keys", () => {
    const data = [
      {
        id: "off_1",
        payout: { amount: "55.00", currency: "USD" },
        chain: "ethereum",
      },
    ];

    expect(formatCsv(data)).toBe(
      "id,payout.amount,payout.currency,chain\noff_1,55.00,USD,ethereum",
    );
  });

  it("unions keys across rows with different shapes", () => {
    const data = [
      { id: "1", a: "x" },
      { id: "2", b: "y" },
    ];

    expect(formatCsv(data)).toBe("id,a,b\n1,x,\n2,,y");
  });

  it("formats a single object as header + one row", () => {
    const data = { id: "ba_1", status: "active", type: "us" };

    expect(formatCsv(data)).toBe("id,status,type\nba_1,active,us");
  });

  it("formats paginated response with footer", () => {
    const data = {
      data: [
        { id: "1", name: "Alice" },
        { id: "2", name: "Bob" },
      ],
      hasMore: true,
      nextCursor: "eyJjcmVh",
    };

    expect(formatCsv(data)).toBe(
      "id,name\n1,Alice\n2,Bob\n---\nhasMore: true\nnextCursor: eyJjcmVh",
    );
  });

  it("formats paginated response without pagination metadata", () => {
    const data = {
      data: [{ id: "1" }],
    };

    expect(formatCsv(data)).toBe("id\n1");
  });

  it("handles empty paginated data array", () => {
    const data = { data: [], hasMore: false };

    expect(formatCsv(data)).toBe("(empty)\n---\nhasMore: false");
  });

  it("returns (empty) for empty array", () => {
    expect(formatCsv([])).toBe("(empty)");
  });

  it("falls back to JSON for primitives", () => {
    expect(formatCsv(42)).toBe("42");
    expect(formatCsv("hello")).toBe('"hello"');
    expect(formatCsv(null)).toBe("null");
    expect(formatCsv(true)).toBe("true");
  });

  it("handles null and undefined values in objects", () => {
    const data = [{ id: "1", name: null, status: undefined }];

    expect(formatCsv(data)).toBe("id,name,status\n1,,");
  });

  it("escapes fields containing commas", () => {
    const data = [{ id: "1", desc: "hello, world" }];

    expect(formatCsv(data)).toBe('id,desc\n1,"hello, world"');
  });

  it("escapes fields containing quotes", () => {
    const data = [{ id: "1", desc: 'say "hi"' }];

    expect(formatCsv(data)).toBe('id,desc\n1,"say ""hi"""');
  });

  it("escapes fields containing newlines", () => {
    const data = [{ id: "1", desc: "line1\nline2" }];

    expect(formatCsv(data)).toBe('id,desc\n1,"line1\nline2"');
  });

  it("deeply flattens nested objects", () => {
    const data = [
      {
        id: "1",
        a: { b: { c: "deep" } },
      },
    ];

    expect(formatCsv(data)).toBe("id,a.b.c\n1,deep");
  });

  it("stringifies array values within objects", () => {
    const data = [{ id: "1", tags: "foo,bar" }];

    expect(formatCsv(data)).toBe('id,tags\n1,"foo,bar"');
  });
});
