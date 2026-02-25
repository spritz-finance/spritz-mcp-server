/**
 * CSV formatting for API responses to reduce token usage on list endpoints.
 */

/**
 * Flatten a nested object into dot-delimited keys.
 *
 *   { payout: { amount: "55.00" } } → { "payout.amount": "55.00" }
 */
function flatten(
  obj: Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flatten(value as Record<string, unknown>, path));
    } else {
      result[path] = value === null || value === undefined ? "" : String(value);
    }
  }

  return result;
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function rowsToCsv(rows: Record<string, string>[]): string {
  if (rows.length === 0) return "";

  // Collect all keys in insertion order across all rows
  const keySet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      keySet.add(key);
    }
  }
  const headers = [...keySet];

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvField(row[h] ?? "")).join(","));
  }
  return lines.join("\n");
}

/**
 * Format API response data as CSV.
 *
 * - Array → header + rows
 * - Object with `data` array → CSV of data + pagination footer
 * - Single object → header + one row
 * - Primitives / non-object → JSON fallback
 */
export function formatCsv(data: unknown): string {
  if (data === null || data === undefined || typeof data !== "object") {
    return JSON.stringify(data);
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return "(empty)";
    const rows = data.map((item) =>
      typeof item === "object" && item !== null
        ? flatten(item as Record<string, unknown>)
        : { value: String(item) },
    );
    return rowsToCsv(rows);
  }

  // Paginated response: { data: [...], hasMore, nextCursor }
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj["data"])) {
    const items = obj["data"] as unknown[];
    const csv =
      items.length === 0
        ? "(empty)"
        : rowsToCsv(
            items.map((item) =>
              typeof item === "object" && item !== null
                ? flatten(item as Record<string, unknown>)
                : { value: String(item) },
            ),
          );

    const meta: string[] = [];
    if ("hasMore" in obj) meta.push(`hasMore: ${obj["hasMore"]}`);
    if ("nextCursor" in obj) meta.push(`nextCursor: ${obj["nextCursor"]}`);

    return meta.length > 0 ? `${csv}\n---\n${meta.join("\n")}` : csv;
  }

  // Single object
  const flat = flatten(obj);
  return rowsToCsv([flat]);
}
