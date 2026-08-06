# Spritz MCP Server

Read-only MCP tools for an individual Spritz **End User account**. The server
exposes a reviewed GET-only subset of the Spritz API from the bundled OpenAPI
specification.

This is not the organization-level Developer API. Developer integrations use a
separate workspace, HMAC credentials, and tool contract; that agent path remains
disabled until those controls are implemented.

## Install

```bash
npx -y @spritz-finance/mcp-server@0.3.2
```

Node.js 18 or newer is required.

## Human-approved End User access

The owner of the affected Spritz account must approve the device grant. An
agent must not create an account, perform identity verification, or approve its
own access.

```bash
spritz auth device start --access user
# The account owner opens the returned URL and approves the requested scopes.
spritz auth device complete
```

The current CLI broker is fail-closed because a package launched through an
ambient Node/npm runtime is not a defensible credential-security boundary
against same-user local code. Do not configure `spritz auth mcp` as the MCP
command until Spritz ships an integrity-verifiable packaged broker.

The server deliberately does not load `.env`,
`~/.config/spritz/api_key`, arbitrary credential commands, or other plaintext
files. Never put a key in argv, MCP JSON, a repository, or logs.

Do not give this End User tool surface a Developer workspace key. Developer
integrations use one human-owned organization workspace and the Developer API's
HMAC credential model; see the
[Developer Access guide](https://docs.spritz.finance/guides/developer-access).

## Interim operator-controlled configuration

Until the packaged broker ships, use this server only with an explicitly
injected credential for a disposable Sandbox/test End User account. Treat the
MCP process as able to read that credential, keep it away from Production data,
and revoke or rotate it after the session. Launch the MCP client itself through
the operator's secret manager so the child inherits the two required variables;
do not paste a credential into the JSON configuration below.

### Claude Desktop and Claude Code

```json
{
  "mcpServers": {
    "spritz": {
      "command": "npx",
      "args": ["-y", "@spritz-finance/mcp-server@0.3.2"]
    }
  }
}
```

### OpenCode

```json
{
  "mcp": {
    "spritz": {
      "type": "local",
      "command": ["npx", "-y", "@spritz-finance/mcp-server@0.3.2"]
    }
  }
}
```

For an operator-controlled disposable Sandbox/test process, an End User Bearer
key may be injected directly. The base URL is required and must be the exact
Sandbox origin shown below; direct Production injection is rejected:

```bash
SPRITZ_API_KEY="${CI_SECRET_VALUE}" \
SPRITZ_API_BASE_URL="https://sandbox.spritz.finance" \
npx -y @spritz-finance/mcp-server@0.3.2
```

## Tools

| Tool | Description |
|------|-------------|
| `list_bank_accounts` | List approved bank destinations |
| `list_off_ramps` | List off-ramp transactions |
| `get_off_ramp_quote` | Check a quote |

Mutating bank-account, quote, transaction-preparation, signing, and submission
tools are deliberately absent. Tool descriptions and MCP annotations cannot
prove fresh human approval. They remain disabled until Spritz can verify a
short-lived approval grant bound to the exact action, account, environment,
amount, destination, rail, chain, token, and fee context. The handler also
rejects every non-GET operation if configuration regresses.

## Architecture

`openapi.json` is the bundled schema. `src/config.ts` selects the reviewed
operations; `src/spec.ts` derives MCP schemas; `src/handlers.ts` dispatches
calls; and `src/client.ts` calls the platform API.

Refresh the spec only through a reviewed change:

```bash
curl -s https://sandbox.spritz.finance/openapi/json > openapi.json
npm test
npm run build
```

## Credential revocation

The account owner can revoke the credential at
[app.spritz.finance/api-keys](https://app.spritz.finance/api-keys). Rotate it
immediately if exposure is suspected.

## Development

```bash
npm install
npm test
npm run build
```

## License

MIT
