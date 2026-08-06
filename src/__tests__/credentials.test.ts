import { describe, expect, it } from "vitest";
import { resolveCredential } from "../credentials.js";

describe("resolveCredential", () => {
  it("prefers a credential injected by the Spritz CLI broker", () => {
    expect(
      resolveCredential({
        SPRITZ_API_KEY: "ak_broker",
        SPRITZ_CREDENTIAL_BROKER: "spritz-cli",
        SPRITZ_CREDENTIAL_STORAGE: "system keychain",
        SPRITZ_CREDENTIAL_ACCESS: "developer",
        SPRITZ_CREDENTIAL_WORKSPACE_ID: "ws_test",
        SPRITZ_CREDENTIAL_ENVIRONMENT: "sandbox",
      }),
    ).toEqual({
      apiKey: "ak_broker",
      source: "spritz-cli",
      storage: "system keychain",
      access: "developer",
      workspaceId: "ws_test",
      environment: "sandbox",
    });
  });

  it("allows an explicit environment credential for secret-managed CI", () => {
    expect(resolveCredential({ SPRITZ_API_KEY: "ak_ci" })).toEqual({
      apiKey: "ak_ci",
      source: "explicit-environment",
    });
  });

  it("fails with broker guidance instead of reading a file", () => {
    expect(() => resolveCredential({})).toThrow(
      "spritz auth mcp",
    );
  });

  it("rejects an unknown credential broker", () => {
    expect(() =>
      resolveCredential({
        SPRITZ_API_KEY: "ak_test",
        SPRITZ_CREDENTIAL_BROKER: "arbitrary-command",
      }),
    ).toThrow("Unsupported SPRITZ_CREDENTIAL_BROKER");
  });

  it("rejects a user-account credential from the CLI broker", () => {
    expect(() =>
      resolveCredential({
        SPRITZ_API_KEY: "ak_user",
        SPRITZ_CREDENTIAL_BROKER: "spritz-cli",
        SPRITZ_CREDENTIAL_ACCESS: "user",
      }),
    ).toThrow("End User/user-account key cannot authorize agent tooling");
  });

  it("rejects Developer Access metadata without a workspace", () => {
    expect(() =>
      resolveCredential({
        SPRITZ_API_KEY: "ak_developer",
        SPRITZ_CREDENTIAL_BROKER: "spritz-cli",
        SPRITZ_CREDENTIAL_ACCESS: "developer",
        SPRITZ_CREDENTIAL_ENVIRONMENT: "sandbox",
      }),
    ).toThrow("omitted the Developer Access workspace ID");
  });
});
