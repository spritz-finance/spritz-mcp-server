import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ToolConfig } from "./config.js";

// ============================================================================
// Types
// ============================================================================

export interface ResolvedOperation {
  /** HTTP method (lowercase) */
  method: string;
  /** URL path template, e.g. /v1/bank-accounts/{accountId} */
  path: string;
  /** JSON Schema for the MCP tool's input */
  inputSchema: Record<string, unknown>;
  /** The original tool config entry */
  config: ToolConfig;
  /** Summary from the spec (fallback for description) */
  summary: string;
}

export interface OpenAPIOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  parameters?: OpenAPIParameter[];
  requestBody?: {
    content?: Record<string, { schema?: Record<string, unknown> }>;
  };
}

export interface OpenAPIParameter {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: Record<string, unknown>;
}

// ============================================================================
// Spec loading
// ============================================================================

export function loadSpec(): Record<string, unknown> {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const specPath = resolve(__dirname, "../../openapi.json");
  return JSON.parse(readFileSync(specPath, "utf-8"));
}

// ============================================================================
// Operation resolution
// ============================================================================

/**
 * Walk every path+method in the spec and index by operationId.
 */
export function indexOperations(
  spec: Record<string, unknown>,
): Map<string, { method: string; path: string; op: OpenAPIOperation }> {
  const paths = spec["paths"] as Record<string, Record<string, unknown>> | undefined;
  if (!paths) return new Map();

  const index = new Map<string, { method: string; path: string; op: OpenAPIOperation }>();

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, opOrRef] of Object.entries(methods)) {
      if (typeof opOrRef !== "object" || opOrRef === null) continue;
      const op = opOrRef as OpenAPIOperation;
      if (op.operationId) {
        index.set(op.operationId, { method, path, op });
      }
    }
  }

  return index;
}

/**
 * Build a JSON Schema inputSchema for an MCP tool from an OpenAPI operation.
 *
 * Merges path params, query params, and request body into a single flat object schema.
 */
export function buildInputSchema(op: OpenAPIOperation): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  // Path and query parameters
  for (const param of op.parameters ?? []) {
    if (param.in === "path" || param.in === "query") {
      properties[param.name] = {
        ...param.schema,
        ...(param.description ? { description: param.description } : {}),
      };
      if (param.required || param.in === "path") {
        required.push(param.name);
      }
    }
  }

  // Request body (JSON only)
  const bodySchema = op.requestBody?.content?.["application/json"]?.schema;
  if (bodySchema && typeof bodySchema === "object" && "properties" in bodySchema) {
    const bodyProps = bodySchema["properties"] as Record<string, unknown> | undefined;
    if (bodyProps) {
      for (const [key, value] of Object.entries(bodyProps)) {
        properties[key] = value;
      }
    }
    const bodyRequired = bodySchema["required"] as string[] | undefined;
    if (bodyRequired) {
      required.push(...bodyRequired);
    }
  }

  return {
    type: "object",
    properties,
    required,
  };
}

/**
 * Resolve the selected tool configs against the OpenAPI spec.
 * Throws if an operationId is not found.
 */
export function resolveTools(
  spec: Record<string, unknown>,
  tools: ToolConfig[],
): ResolvedOperation[] {
  const index = indexOperations(spec);
  const resolved: ResolvedOperation[] = [];

  for (const config of tools) {
    const entry = index.get(config.operationId);
    if (!entry) {
      throw new Error(
        `operationId "${config.operationId}" not found in OpenAPI spec. ` +
        `Available: ${[...index.keys()].join(", ")}`,
      );
    }

    resolved.push({
      method: entry.method,
      path: entry.path,
      inputSchema: buildInputSchema(entry.op),
      config,
      summary: entry.op.summary ?? "",
    });
  }

  return resolved;
}

/**
 * Convert resolved operations to MCP tool definitions.
 */
export function toMcpTools(operations: ResolvedOperation[]) {
  return operations.map((op) => ({
    name: op.config.name,
    description: op.config.description ?? op.summary,
    inputSchema: op.inputSchema,
  }));
}
