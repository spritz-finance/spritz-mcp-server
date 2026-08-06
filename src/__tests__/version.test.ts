import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SERVER_VERSION } from "../version.js";

describe("server version", () => {
  it("matches the published package version", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf-8"),
    ) as { version: string };

    expect(SERVER_VERSION).toBe(packageJson.version);
  });
});
