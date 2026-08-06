export type CredentialSource = "spritz-cli" | "explicit-environment";
export type EndUserEnvironment = "sandbox" | "production";

export interface ResolvedCredential {
  apiKey: string;
  source: CredentialSource;
  access: "user";
  environment: EndUserEnvironment;
  baseUrl: string;
  storage?: string;
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
 * commands, or legacy plaintext key files. Local interactive use starts the
 * process through `spritz auth mcp --access user`; secret-managed CI may inject
 * an End User SPRITZ_API_KEY explicitly.
 */
export function resolveCredential(
  env: NodeJS.ProcessEnv = process.env,
): ResolvedCredential {
  const apiKey = env.SPRITZ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "No Spritz End User credential was injected. After the account owner approves device access, start with `spritz auth mcp --access user`; CI may inject SPRITZ_API_KEY from a secret manager.",
    );
  }

  const broker = env.SPRITZ_CREDENTIAL_BROKER;
  if (broker && broker !== "spritz-cli") {
    throw new Error(`Unsupported SPRITZ_CREDENTIAL_BROKER: ${broker}`);
  }

  if (broker === "spritz-cli") {
    if (env.SPRITZ_CREDENTIAL_ACCESS === "developer") {
      throw new Error(
        "This MCP tool surface acts on an End User account. Developer workspace-agent access requires a separate HMAC/scoped grant and tool contract and remains disabled.",
      );
    }
    if (env.SPRITZ_CREDENTIAL_ACCESS !== "user") {
      throw new Error("The Spritz CLI broker omitted the End User access principal.");
    }
    if (!env.SPRITZ_CREDENTIAL_API_BASE_URL) {
      throw new Error("The Spritz CLI broker omitted the attested API origin.");
    }

    const endpoint = resolveOfficialEndUserEndpoint(
      env.SPRITZ_CREDENTIAL_API_BASE_URL,
    );
    if (env.SPRITZ_CREDENTIAL_ENVIRONMENT !== endpoint.environment) {
      throw new Error(
        "The Spritz CLI broker supplied inconsistent environment and API-origin metadata.",
      );
    }

    return {
      apiKey,
      source: "spritz-cli",
      access: "user",
      ...endpoint,
      ...(env.SPRITZ_CREDENTIAL_STORAGE
        ? { storage: env.SPRITZ_CREDENTIAL_STORAGE }
        : {}),
    };
  }

  const strayBrokerMetadata = Object.keys(env).some((name) =>
    name.startsWith("SPRITZ_CREDENTIAL_"),
  );
  if (strayBrokerMetadata) {
    throw new Error(
      "Spritz broker metadata was provided without SPRITZ_CREDENTIAL_BROKER=spritz-cli.",
    );
  }

  if (!env.SPRITZ_API_BASE_URL) {
    throw new Error(
      "SPRITZ_API_BASE_URL is required with an explicitly injected credential; choose the exact Sandbox or Production origin deliberately.",
    );
  }
  const endpoint = resolveOfficialEndUserEndpoint(env.SPRITZ_API_BASE_URL);
  return {
    apiKey,
    source: "explicit-environment",
    access: "user",
    ...endpoint,
  };
}
