import { describe, expect, it } from "vitest";
import {
  resolveCredential,
  resolveOfficialEndUserEndpoint,
} from "../credentials.js";

describe("resolveCredential", () => {
  it("rejects forgeable CLI broker metadata until the packaged broker ships", () => {
    expect(() =>
      resolveCredential({
        SPRITZ_API_KEY: "sk_live_broker",
        SPRITZ_CREDENTIAL_BROKER: "spritz-cli",
        SPRITZ_CREDENTIAL_STORAGE: "system keychain",
        SPRITZ_CREDENTIAL_ACCESS: "user",
        SPRITZ_CREDENTIAL_ENVIRONMENT: "production",
        SPRITZ_CREDENTIAL_API_BASE_URL:
          "https://platform.spritz.finance",
      }),
    ).toThrow("integrity-verifiable packaged broker");
  });

  it("derives Sandbox for an explicit secret-managed CI credential", () => {
    expect(
      resolveCredential({
        SPRITZ_API_KEY: "sk_test_ci",
        SPRITZ_API_BASE_URL: "https://sandbox.spritz.finance",
      }),
    ).toEqual({
      apiKey: "sk_test_ci",
      source: "explicit-environment",
      access: "user",
      environment: "sandbox",
      baseUrl: "https://sandbox.spritz.finance",
    });
  });

  it("requires an explicit API origin with a directly injected credential", () => {
    expect(() => resolveCredential({ SPRITZ_API_KEY: "sk_live_ci" })).toThrow(
      "SPRITZ_API_BASE_URL is required",
    );
  });

  it("rejects a directly injected Production credential", () => {
    expect(() =>
      resolveCredential({
        SPRITZ_API_KEY: "sk_live_ci",
        SPRITZ_API_BASE_URL: "https://platform.spritz.finance",
      }),
    ).toThrow("limited to a disposable Sandbox/test End User account");
  });

  it("fails with disposable Sandbox guidance instead of reading a file", () => {
    expect(() => resolveCredential({})).toThrow(
      "operator-controlled disposable Sandbox/test credential",
    );
  });

  it("rejects any unknown credential broker", () => {
    expect(() =>
      resolveCredential({
        SPRITZ_API_KEY: "sk_live_test",
        SPRITZ_CREDENTIAL_BROKER: "arbitrary-command",
      }),
    ).toThrow("integrity-verifiable packaged broker");
  });

  it("rejects Developer broker metadata before considering its credential", () => {
    expect(() =>
      resolveCredential({
        SPRITZ_API_KEY: "not-a-bearer-contract",
        SPRITZ_CREDENTIAL_BROKER: "spritz-cli",
        SPRITZ_CREDENTIAL_ACCESS: "developer",
        SPRITZ_CREDENTIAL_ENVIRONMENT: "sandbox",
        SPRITZ_CREDENTIAL_API_BASE_URL:
          "https://sandbox.spritz.finance",
      }),
    ).toThrow("integrity-verifiable packaged broker");
  });

  it("rejects broker metadata without a broker attestation", () => {
    expect(() =>
      resolveCredential({
        SPRITZ_API_KEY: "sk_live_test",
        SPRITZ_CREDENTIAL_ACCESS: "user",
      }),
    ).toThrow("metadata is not accepted");
  });
});

describe("resolveOfficialEndUserEndpoint", () => {
  it.each([
    [
      "https://sandbox.spritz.finance/",
      {
        baseUrl: "https://sandbox.spritz.finance",
        environment: "sandbox",
      },
    ],
    [
      "https://platform.spritz.finance",
      {
        baseUrl: "https://platform.spritz.finance",
        environment: "production",
      },
    ],
  ])("allows %s", (url, expected) => {
    expect(resolveOfficialEndUserEndpoint(url)).toEqual(expected);
  });

  it.each([
    "http://platform.spritz.finance",
    "https://platform.spritz.finance.evil.example",
    "https://platform.spritz.finance/v1",
    "https://user@platform.spritz.finance",
    "https://platform.spritz.finance?next=https://evil.example",
  ])("rejects redirectable origin %s", (url) => {
    expect(() => resolveOfficialEndUserEndpoint(url)).toThrow();
  });
});
