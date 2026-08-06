export type CredentialSource = "spritz-cli" | "explicit-environment";

export interface ResolvedCredential {
  apiKey: string;
  source: CredentialSource;
  storage?: string;
  access?: "developer";
  workspaceId?: string;
  environment?: "sandbox" | "live_test" | "production";
}

/**
 * Resolve only an explicitly injected process credential.
 *
 * The server intentionally does not load .env files, arbitrary credential
 * commands, or legacy plaintext key files. Local interactive use should start
 * the process through `spritz auth mcp`; CI may inject SPRITZ_API_KEY from a
 * secret manager.
 */
export function resolveCredential(
  env: NodeJS.ProcessEnv = process.env,
): ResolvedCredential {
  const apiKey = env.SPRITZ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "No Spritz credential was injected. After a human approves device access, start with `spritz auth mcp`; CI may inject SPRITZ_API_KEY from a secret manager.",
    );
  }

  const broker = env.SPRITZ_CREDENTIAL_BROKER;
  if (broker && broker !== "spritz-cli") {
    throw new Error(`Unsupported SPRITZ_CREDENTIAL_BROKER: ${broker}`);
  }

  if (broker === "spritz-cli") {
    if (env.SPRITZ_CREDENTIAL_ACCESS !== "developer") {
      throw new Error(
        "The Spritz CLI broker did not provide a Developer Access workspace credential. An End User/user-account key cannot authorize agent tooling.",
      );
    }
    if (!env.SPRITZ_CREDENTIAL_WORKSPACE_ID) {
      throw new Error("The Spritz CLI broker omitted the Developer Access workspace ID.");
    }
    if (
      env.SPRITZ_CREDENTIAL_ENVIRONMENT !== "sandbox" &&
      env.SPRITZ_CREDENTIAL_ENVIRONMENT !== "live_test" &&
      env.SPRITZ_CREDENTIAL_ENVIRONMENT !== "production"
    ) {
      throw new Error(
        `Invalid Developer Access environment: ${env.SPRITZ_CREDENTIAL_ENVIRONMENT ?? "missing"}`,
      );
    }
  }

  return {
    apiKey,
    source: broker === "spritz-cli" ? "spritz-cli" : "explicit-environment",
    ...(env.SPRITZ_CREDENTIAL_STORAGE
      ? { storage: env.SPRITZ_CREDENTIAL_STORAGE }
      : {}),
    ...(broker === "spritz-cli"
      ? {
          access: "developer" as const,
          workspaceId: env.SPRITZ_CREDENTIAL_WORKSPACE_ID,
          environment: env.SPRITZ_CREDENTIAL_ENVIRONMENT as
            | "sandbox"
            | "live_test"
            | "production",
        }
      : {}),
  };
}
