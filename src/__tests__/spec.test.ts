import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  indexOperations,
  buildInputSchema,
  resolveTools,
  toMcpTools,
  loadSpec,
} from "../spec.js";
import type { OpenAPIOperation } from "../spec.js";
import type { ToolConfig } from "../config.js";

// ============================================================================
// Helpers
// ============================================================================

/** Minimal spec with one GET and one POST operation. */
function makeSpec(
  paths: Record<string, Record<string, unknown>>,
): Record<string, unknown> {
  return { openapi: "3.0.0", info: { title: "test", version: "1" }, paths };
}

// ============================================================================
// indexOperations
// ============================================================================

describe("indexOperations", () => {
  it("indexes operations by operationId", () => {
    const spec = makeSpec({
      "/v1/things": {
        get: { operationId: "listThings", summary: "List" },
        post: { operationId: "createThing", summary: "Create" },
      },
    });

    const index = indexOperations(spec);

    expect(index.size).toBe(2);
    expect(index.get("listThings")).toMatchObject({
      method: "get",
      path: "/v1/things",
    });
    expect(index.get("createThing")).toMatchObject({
      method: "post",
      path: "/v1/things",
    });
  });

  it("returns empty map when spec has no paths", () => {
    expect(indexOperations({ openapi: "3.0.0" }).size).toBe(0);
  });

  it("skips entries without operationId", () => {
    const spec = makeSpec({
      "/v1/things": {
        get: { summary: "no operationId" },
      },
    });
    expect(indexOperations(spec).size).toBe(0);
  });

  it("skips non-object entries (e.g. parameters key on path item)", () => {
    const spec = makeSpec({
      "/v1/things": {
        parameters: "not an object" as unknown,
        get: { operationId: "listThings" },
      },
    });
    const index = indexOperations(spec);
    expect(index.size).toBe(1);
    expect(index.has("listThings")).toBe(true);
  });
});

// ============================================================================
// buildInputSchema
// ============================================================================

describe("buildInputSchema", () => {
  it("returns empty schema for operation with no params or body", () => {
    const op: OpenAPIOperation = {};
    const schema = buildInputSchema(op);

    expect(schema).toEqual({
      type: "object",
      properties: {},
      required: [],
    });
  });

  it("adds path param as required string property", () => {
    const op: OpenAPIOperation = {
      parameters: [
        {
          name: "accountId",
          in: "path",
          required: true,
          description: "The account ID",
          schema: { type: "string" },
        },
      ],
    };
    const schema = buildInputSchema(op);

    expect(schema).toEqual({
      type: "object",
      properties: {
        accountId: { type: "string", description: "The account ID" },
      },
      required: ["accountId"],
    });
  });

  it("path params are always required even without required: true", () => {
    const op: OpenAPIOperation = {
      parameters: [{ name: "id", in: "path", schema: { type: "string" } }],
    };
    const schema = buildInputSchema(op);

    expect((schema as { required: string[] }).required).toContain("id");
  });

  it("adds optional query params", () => {
    const op: OpenAPIOperation = {
      parameters: [
        {
          name: "limit",
          in: "query",
          schema: { type: "integer" },
        },
      ],
    };
    const schema = buildInputSchema(op);

    expect(schema).toEqual({
      type: "object",
      properties: {
        limit: { type: "integer" },
      },
      required: [],
    });
  });

  it("adds required query params", () => {
    const op: OpenAPIOperation = {
      parameters: [
        {
          name: "from",
          in: "query",
          required: true,
          schema: { type: "string" },
        },
        {
          name: "to",
          in: "query",
          required: true,
          schema: { type: "string" },
        },
      ],
    };
    const schema = buildInputSchema(op);

    expect((schema as { required: string[] }).required).toEqual(["from", "to"]);
  });

  it("merges request body properties and required", () => {
    const op: OpenAPIOperation = {
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                amount: { type: "string" },
                note: { type: "string" },
              },
              required: ["amount"],
            },
          },
        },
      },
    };
    const schema = buildInputSchema(op);

    expect(schema).toEqual({
      type: "object",
      properties: {
        amount: { type: "string" },
        note: { type: "string" },
      },
      required: ["amount"],
    });
  });

  it("merges path params with body params", () => {
    const op: OpenAPIOperation = {
      parameters: [
        {
          name: "accountId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                amount: { type: "string" },
              },
              required: ["amount"],
            },
          },
        },
      },
    };
    const schema = buildInputSchema(op);

    const props = (schema as { properties: Record<string, unknown> }).properties;
    expect(Object.keys(props)).toEqual(["accountId", "amount"]);
    expect((schema as { required: string[] }).required).toEqual([
      "accountId",
      "amount",
    ]);
  });

  it("ignores header and cookie params", () => {
    const op: OpenAPIOperation = {
      parameters: [
        { name: "X-Custom", in: "header", schema: { type: "string" } },
        { name: "session", in: "cookie", schema: { type: "string" } },
        { name: "id", in: "path", schema: { type: "string" } },
      ],
    };
    const schema = buildInputSchema(op);

    const props = (schema as { properties: Record<string, unknown> }).properties;
    expect(Object.keys(props)).toEqual(["id"]);
  });

  it("merges anyOf variants: union of properties, intersection of required", () => {
    const op: OpenAPIOperation = {
      requestBody: {
        content: {
          "application/json": {
            schema: {
              anyOf: [
                {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    name: { type: "string" },
                    routing_number: { type: "string" },
                  },
                  required: ["type", "name", "routing_number"],
                },
                {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    name: { type: "string" },
                    iban: { type: "string" },
                  },
                  required: ["type", "name", "iban"],
                },
              ],
            },
          },
        },
      },
    };
    const schema = buildInputSchema(op);
    const props = (schema as { properties: Record<string, unknown> }).properties;
    const req = (schema as { required: string[] }).required;

    // Union of all properties
    expect(Object.keys(props).sort()).toEqual(["iban", "name", "routing_number", "type"]);
    // Only fields required by ALL variants
    expect(req.sort()).toEqual(["name", "type"]);
  });

  it("merges const values across anyOf variants into enum", () => {
    const op: OpenAPIOperation = {
      requestBody: {
        content: {
          "application/json": {
            schema: {
              anyOf: [
                {
                  type: "object",
                  properties: {
                    type: { const: "us", type: "string", description: "Account type" },
                    name: { type: "string" },
                  },
                  required: ["type", "name"],
                },
                {
                  type: "object",
                  properties: {
                    type: { const: "iban", type: "string", description: "Account type" },
                    name: { type: "string" },
                  },
                  required: ["type", "name"],
                },
              ],
            },
          },
        },
      },
    };
    const schema = buildInputSchema(op);
    const props = (schema as { properties: Record<string, unknown> }).properties;
    const typeField = props["type"] as Record<string, unknown>;

    expect(typeField["enum"]).toEqual(["us", "iban"]);
    expect(typeField["const"]).toBeUndefined();
    expect(typeField["description"]).toBe("Account type");
    expect(typeField["type"]).toBe("string");
  });

  it("handles oneOf the same as anyOf", () => {
    const op: OpenAPIOperation = {
      requestBody: {
        content: {
          "application/json": {
            schema: {
              oneOf: [
                {
                  type: "object",
                  properties: { a: { type: "string" } },
                  required: ["a"],
                },
                {
                  type: "object",
                  properties: { a: { type: "string" }, b: { type: "string" } },
                  required: ["a", "b"],
                },
              ],
            },
          },
        },
      },
    };
    const schema = buildInputSchema(op);
    const props = (schema as { properties: Record<string, unknown> }).properties;
    const req = (schema as { required: string[] }).required;

    expect(Object.keys(props).sort()).toEqual(["a", "b"]);
    expect(req).toEqual(["a"]);
  });

  it("handles anyOf variants without properties gracefully", () => {
    const op: OpenAPIOperation = {
      requestBody: {
        content: {
          "application/json": {
            schema: {
              anyOf: [{ type: "object" }, { type: "string" }],
            },
          },
        },
      },
    };
    const schema = buildInputSchema(op);

    expect(schema).toEqual({
      type: "object",
      properties: {},
      required: [],
    });
  });
});

// ============================================================================
// resolveTools
// ============================================================================

describe("resolveTools", () => {
  const spec = makeSpec({
    "/v1/things": {
      get: {
        operationId: "listThings",
        summary: "List things",
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
      },
    },
    "/v1/things/{id}": {
      get: {
        operationId: "getThing",
        summary: "Get a thing",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
      },
    },
  });

  it("resolves valid operationIds", () => {
    const tools: ToolConfig[] = [
      { name: "list_things", operationId: "listThings" },
    ];
    const resolved = resolveTools(spec, tools);

    expect(resolved).toHaveLength(1);
    expect(resolved[0]).toMatchObject({
      method: "get",
      path: "/v1/things",
      summary: "List things",
    });
    expect(resolved[0].config).toBe(tools[0]);
  });

  it("throws for unknown operationId with available IDs", () => {
    const tools: ToolConfig[] = [
      { name: "nope", operationId: "doesNotExist" },
    ];

    expect(() => resolveTools(spec, tools)).toThrow(
      /operationId "doesNotExist" not found/,
    );
    expect(() => resolveTools(spec, tools)).toThrow(/listThings/);
  });

  it("builds inputSchema from the operation", () => {
    const tools: ToolConfig[] = [
      { name: "get_thing", operationId: "getThing" },
    ];
    const resolved = resolveTools(spec, tools);

    expect(resolved[0].inputSchema).toEqual({
      type: "object",
      properties: {
        id: { type: "string" },
      },
      required: ["id"],
    });
  });

  it("uses empty string when summary is missing", () => {
    const noSummarySpec = makeSpec({
      "/v1/x": { get: { operationId: "x" } },
    });
    const resolved = resolveTools(noSummarySpec, [
      { name: "x", operationId: "x" },
    ]);
    expect(resolved[0].summary).toBe("");
  });
});

// ============================================================================
// toMcpTools
// ============================================================================

describe("toMcpTools", () => {
  it("maps resolved operations to MCP tool definitions", () => {
    const ops = [
      {
        method: "get",
        path: "/v1/things",
        inputSchema: { type: "object", properties: {}, required: [] },
        config: {
          name: "list_things",
          operationId: "listThings",
          description: "Custom desc",
        },
        summary: "Spec summary",
      },
    ];

    const tools = toMcpTools(ops);

    expect(tools).toEqual([
      {
        name: "list_things",
        description: "Custom desc",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
    ]);
  });

  it("falls back to summary when config has no description", () => {
    const ops = [
      {
        method: "get",
        path: "/v1/things",
        inputSchema: { type: "object", properties: {}, required: [] },
        config: { name: "list_things", operationId: "listThings" },
        summary: "Spec summary",
      },
    ];

    const tools = toMcpTools(ops);
    expect(tools[0].description).toBe("Spec summary");
  });
});

// ============================================================================
// loadSpec (integration — reads real openapi.json)
// ============================================================================

/**
 * loadSpec resolves relative to __dirname which differs between vitest (src/)
 * and the built output (build/src/). Load the spec directly as a fallback.
 */
function loadSpecSafe(): Record<string, unknown> {
  try {
    return loadSpec();
  } catch {
    const specPath = resolve(import.meta.dirname!, "../../openapi.json");
    return JSON.parse(readFileSync(specPath, "utf-8"));
  }
}

describe("loadSpec", () => {
  it("loads and parses openapi.json", () => {
    const spec = loadSpecSafe();

    expect(spec).toHaveProperty("openapi");
    expect(spec).toHaveProperty("paths");
    expect(typeof spec["paths"]).toBe("object");
  });

  it("has at least one path with an operationId", () => {
    const spec = loadSpecSafe();
    const index = indexOperations(spec);
    expect(index.size).toBeGreaterThan(0);
  });
});
