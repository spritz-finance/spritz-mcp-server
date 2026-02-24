# Spritz MCP Server

MCP server for [Spritz](https://spritz.finance) fiat rails — let AI agents off-ramp crypto to bank accounts.

## What This Does

An MCP (Model Context Protocol) server that gives AI agents tools to:

- Add and manage bank account destinations
- Create off-ramp payments (crypto → fiat)
- Track payment status and history

The agent sends crypto to a Spritz deposit address, and Spritz delivers USD to the specified bank account via ACH.

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

### Bank Accounts

| Tool | Description |
|------|-------------|
| `get_bank_accounts` | List all saved bank account destinations |
| `get_bank_account` | Get details for a specific bank account |
| `create_bank_account` | Add a new bank account destination |
| `delete_bank_account` | Remove a bank account |

### Payments

| Tool | Description |
|------|-------------|
| `create_payment` | Create an off-ramp payment (crypto → fiat) |
| `get_payment` | Check payment status |
| `get_payments` | List payment history |

## How It Works

1. Agent calls `create_payment` with USD amount, bank account, network, and token
2. Spritz returns a deposit address and crypto amount
3. Agent sends crypto to the deposit address (using its own wallet)
4. Spritz converts and delivers fiat via ACH (1-3 business days)

**Note:** The agent needs its own crypto wallet to send tokens. This server handles the Spritz API side only.

## Development

```bash
npm install
npm run dev          # Watch mode
npm run build        # Build
npm run inspector    # MCP inspector
```

## License

MIT
