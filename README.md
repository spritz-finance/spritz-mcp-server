# Spritz MCP Server

MCP server for [Spritz](https://www.spritz.finance) fiat rails — let AI agents off-ramp crypto to bank accounts.

## What This Does

An MCP (Model Context Protocol) server that gives AI agents tools to interact with the Spritz API. Tools are derived from the [OpenAPI spec](https://sandbox.spritz.finance/openapi/json) — no hand-written schemas.

## Installation

### npx (recommended)

```bash
npx @spritz-finance/mcp-server
```

### Global install

```bash
npm install -g @spritz-finance/mcp-server
spritz-mcp-server
```

### From source

```bash
git clone https://github.com/spritz-finance/spritz-mcp-server.git
cd spritz-mcp-server
npm install && npm run build
```

## Configuration

### 1. Get Your API Key

1. Log in to [app.spritz.finance](https://app.spritz.finance)
2. Go to **Settings > API Keys**
3. Create a new key

### 2. Configure Your MCP Client

#### Claude Desktop

Add to `~/.config/claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "spritz": {
      "command": "npx",
      "args": ["@spritz-finance/mcp-server"],
      "env": {
        "SPRITZ_API_KEY": "your-api-key"
      }
    }
  }
}
```

#### Claude Code

Add to your project's `.mcp.json`:

```json
{
  "spritz": {
    "command": "npx",
    "args": ["@spritz-finance/mcp-server"],
    "env": {
      "SPRITZ_API_KEY": "your-api-key"
    }
  }
}
```

#### Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "spritz": {
      "command": "npx",
      "args": ["@spritz-finance/mcp-server"],
      "env": {
        "SPRITZ_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `list_bank_accounts` | List all bank accounts saved as off-ramp payment destinations |

More tools coming soon.

## Architecture

Tools are driven by the OpenAPI spec — not hand-written. To expose a new endpoint, add one entry to `src/config.ts`:

```ts
export const EXPOSED_TOOLS: ToolConfig[] = [
  {
    name: "list_bank_accounts",
    operationId: "getV1Bank-accounts",
    description: "List all bank accounts saved as off-ramp payment destinations.",
  },
  // To add a new tool, just add another entry here.
  // The inputSchema, HTTP method, and path are all derived from the OpenAPI spec.
];
```

The server reads `openapi.json`, finds each `operationId`, extracts the JSON Schema for parameters and request bodies, and registers them as MCP tools. A generic handler dispatches tool calls to the Spritz API.

```
openapi.json          → source of truth for request/response schemas
src/config.ts         → which operations to expose (cherry-pick)
src/spec.ts           → reads spec, builds MCP tool definitions
src/handlers.ts       → generic dispatcher (path params, query, body)
src/index.ts          → MCP server + API client
```

## Development

```bash
npm install
npm run dev          # Watch mode
npm run build        # Build
npm run inspector    # MCP inspector
```

### Updating the OpenAPI spec

```bash
curl -s https://sandbox.spritz.finance/openapi/json > openapi.json
```

## License

MIT
