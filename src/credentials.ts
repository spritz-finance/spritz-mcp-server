export type CredentialSource = "explicit-environment";
export type EndUserEnvironment = "sandbox" | "production";

export interface ResolvedCredential {
  apiKey: string;
  source: CredentialSource;
  access: "user";
  environment: EndUserEnvironment;
  baseUrl: string;
}

const OFFICIAL_END_USER_ENDPOINTS: Record<string, EndUserEnvironment> = {
  "https://sandbox.spritz.finance": "sandbox",
  "https://platform.spritz.finance": "production",
};

/**
 * Resolve the exact official API origin for this End User account tool
 * surface. Credentials are never sent to arbitrary configured hosts.
 */
export function resolveOfficialEndUserEndpoint(rawUrl: string): {
  baseUrl: string;
  environment: EndUserEnvironment;
} {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid Spritz API origin.");
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    (parsed.pathname !== "" && parsed.pathname !== "/") ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw new Error("The Spritz MCP server requires an official HTTPS API origin.");
  }

  const baseUrl = parsed.origin;
  const environment = OFFICIAL_END_USER_ENDPOINTS[baseUrl];
  if (!environment) {
    throw new Error(
      `The Spritz MCP server does not allow API origin ${JSON.stringify(rawUrl)}; expected https://platform.spritz.finance or https://sandbox.spritz.finance.`,
    );
  }
  return { baseUrl, environment };
}

/**
 * Resolve an End User account Bearer credential only.
 *
 * The server intentionally does not load .env files, arbitrary credential
 * commands, or legacy plaintext key files. Until an integrity-verifiable CLI
 * broker ships, an operator may inject an End User SPRITZ_API_KEY only into a
 * disposable Sandbox/test process.
 */
export function resolveCredential(
  env: NodeJS.ProcessEnv = process.env,
): ResolvedCredential {
  const apiKey = env.SPRITZ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "No Spritz End User credential was injected. Use an operator-controlled disposable Sandbox/test credential; the current `spritz auth mcp` broker is fail-closed.",
    );
  }

  const broker = env.SPRITZ_CREDENTIAL_BROKER;
  if (broker) {
    throw new Error(
      "CLI broker metadata is not accepted until Spritz ships an integrity-verifiable packaged broker.",
    );
  }

  const strayBrokerMetadata = Object.keys(env).some((name) =>
    name.startsWith("SPRITZ_CREDENTIAL_"),
  );
  if (strayBrokerMetadata) {
    throw new Error(
      "Spritz broker metadata is not accepted by this release.",
    );
  }

  if (!env.SPRITZ_API_BASE_URL) {
    throw new Error(
      "SPRITZ_API_BASE_URL is required with an explicitly injected credential; use the exact Sandbox origin for this interim path.",
    );
  }
  const endpoint = resolveOfficialEndUserEndpoint(env.SPRITZ_API_BASE_URL);
  if (endpoint.environment !== "sandbox") {
    throw new Error(
      "Direct credential injection is limited to a disposable Sandbox/test End User account until an integrity-verifiable broker ships.",
    );
  }
  return {
    apiKey,
    source: "explicit-environment",
    access: "user",
    ...endpoint,
  };
}
