# 🚀 ETH Price & Gas Price Telegram Bot

A Telegram bot that provides real-time Ethereum price and gas price information.

## Features

- 💰 Get current ETH price from CoinGecko API
- ⛽ Get current gas prices from Etherscan API
- 🤖 Simple Telegram bot interface
- 📊 Real-time data updates

## Setup

### 1. Prerequisites

- Node.js (>=18) or Bun
- Telegram Bot Token
- Etherscan API Key (free)

### 2. Installation

```bash
# Install dependencies
bun install

# Or with npm
npm install
```

### 3. Configuration

1. **Get Telegram Bot Token:**
   - Open Telegram
   - Search for @BotFather
   - Run `/newbot` and follow instructions
   - Copy the token

2. **Get Etherscan API Key:**
   - Go to [Etherscan API](https://etherscan.io/apis)
   - Sign up for a free account
   - Get your API key

3. **Update .env file:**
   ```env
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   ETHERSCAN_API_KEY=your_etherscan_api_key_here
   ```

### 4. Run the Bot

```bash
# With Bun
bun run index.js

# Or with Node.js
node index.js
```

## Commands

- `/start` - Welcome message
- `/price` - Get current ETH price
- `/gas` - Get current gas prices
- `/help` - Show help message

## API Sources

- **ETH Price:** CoinGecko API (free, no key required)
- **Gas Prices:** Etherscan API (free tier available)

## Error Handling

The bot includes error handling for:
- Network connectivity issues
- API rate limits
- Invalid responses
- Missing environment variables

## License

MIT
