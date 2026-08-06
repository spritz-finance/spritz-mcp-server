# Spritz MCP Server

MCP tools for Spritz fiat rails. The server exposes a reviewed subset of the
Spritz API from the bundled OpenAPI specification.

## Install

```bash
npx -y @spritz-finance/mcp-server
```

Node.js 18 or newer is required.

## Human-approved agent access

An AI agent must not accept Developer Terms, perform business verification, or
own a Production credential. A human administrator enrolls the legal entity in
[Developer Access](https://console.spritz.finance) for **Sandbox** or requests
**Live Test**, then approves a scoped, expiring device grant. **Production** is
a separate commercial service with its own verification, agreements, and
credentials.

For local agent tools, keep the key in the Spritz CLI's system-keychain storage
and launch the MCP server through its credential broker:

```bash
spritz auth device start --access developer
# A human opens the returned URL and approves the requested scopes.
spritz auth device complete
spritz auth mcp
```

The deployed device flow currently authorizes a Spritz **user account** at
`app.spritz.finance`; it is not yet a Developer Access workspace grant. The
workspace mode therefore fails closed until the platform contract is deployed.
`spritz auth mcp` also requires metadata proving the workspace and Sandbox,
Live Test, or Production environment. Never work around either response by
giving an agent a user key or a raw Production key.

The MCP server deliberately does not load `.env`, `~/.config/spritz/api_key`,
arbitrary credential commands, or other plaintext files. The broker injects the
credential and workspace metadata only into the fixed MCP child process
environment. A secret manager may inject
`SPRITZ_API_KEY` directly for CI as an explicit fallback.

## MCP client configuration

Use the broker command in local MCP clients.

### Claude Desktop

```json
{
  "mcpServers": {
    "spritz": {
      "command": "spritz",
      "args": ["auth", "mcp"]
    }
  }
}
```

### Claude Code

```json
{
  "mcpServers": {
    "spritz": {
      "command": "spritz",
      "args": ["auth", "mcp"]
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
      "command": ["spritz", "auth", "mcp"]
    }
  }
}
```

For secret-managed CI only:

```bash
SPRITZ_API_KEY="${CI_SECRET_VALUE}" npx -y @spritz-finance/mcp-server
```

Do not place a key in MCP JSON, argv, a repository `.env`, or a plaintext
configuration file.

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

Agent callers must obtain explicit human confirmation before creating or
deleting a bank account, creating a quote that may be funded, or signing and
submitting an on-chain transaction.

## Architecture

`openapi.json` is the bundled schema. `src/config.ts` selects the reviewed
operations; `src/spec.ts` derives MCP schemas; `src/handlers.ts` dispatches calls;
and `src/client.ts` calls the platform API.

Refresh the spec only through a reviewed change:

```bash
curl -s https://sandbox.spritz.finance/openapi/json > openapi.json
npm test
npm run build
```

## Development

```bash
npm install
npm test
npm run build
```

## License

MIT
