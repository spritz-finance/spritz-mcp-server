# Spritz MCP Server

MCP tools for an individual Spritz **End User account**. The server exposes a
reviewed subset of the Spritz API from the bundled OpenAPI specification.

This is not the organization-level Developer API. Developer integrations use a
separate workspace, HMAC credentials, and tool contract; that agent path remains
disabled until those controls are implemented.

## Install

```bash
npx -y @spritz-finance/mcp-server
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
spritz auth mcp --access user
```

The CLI stores the End User Bearer credential in the system keychain and
injects it only into this fixed MCP child process. The broker attests the access
mode and selects one of the two exact API origins supported by this server:
`https://platform.spritz.finance` or `https://sandbox.spritz.finance`.

The server deliberately does not load `.env`,
`~/.config/spritz/api_key`, arbitrary credential commands, or other plaintext
files. Never put a key in argv, MCP JSON, a repository, or logs.

`spritz auth mcp --access developer` intentionally fails closed. Do not give
this End User tool surface a Developer workspace key. A future workspace-agent
surface must use the Developer API's HMAC/scoped authorization model and be
reviewed independently.

## MCP client configuration

Use the End User broker command in local MCP clients.

### Claude Desktop and Claude Code

```json
{
  "mcpServers": {
    "spritz": {
      "command": "spritz",
      "args": ["auth", "mcp", "--access", "user"]
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
      "command": ["spritz", "auth", "mcp", "--access", "user"]
    }
  }
}
```

For secret-managed CI only, an End User Bearer key may be injected directly.
The optional base URL must be one of the exact official origins above:

```bash
SPRITZ_API_KEY="${CI_SECRET_VALUE}" \
SPRITZ_API_BASE_URL="https://sandbox.spritz.finance" \
npx -y @spritz-finance/mcp-server
```

## Tools

| Tool | Description |
|------|-------------|
| `list_bank_accounts` | List approved bank destinations |
| `create_bank_account` | Add a US, Canadian, UK, or IBAN destination |
| `delete_bank_account` | Remove a bank destination |
| `list_off_ramps` | List off-ramp transactions |
| `create_off_ramp_quote` | Create a crypto-to-fiat quote |
| `get_off_ramp_quote` | Check a quote |
| `get_off_ramp_transaction` | Get transaction parameters to sign and submit |

These tools act on the approving human's End User account. Agent callers must
obtain fresh, explicit human confirmation before creating or deleting a bank
account, creating a quote that may be funded, or signing and submitting an
on-chain transaction. A live End User account carries real-money risk.

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
