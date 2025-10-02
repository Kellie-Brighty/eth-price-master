# 🚀 ETH Price & Gas Bot - Advanced Telegram Bot

A comprehensive Telegram bot that provides real-time Ethereum market data, gas price alerts, and prediction games for both private chats and groups.

## ✨ Features

### 📊 **Market Data**
- Real-time ETH price tracking
- Live gas price monitoring (Safe, Standard, Fast)
- Interactive buttons for quick access
- Professional formatting with 3-decimal precision

### 🔔 **Gas Price Alerts**
- Set custom gas price thresholds (supports decimals)
- Automatic notifications when gas drops below your threshold
- Works in both private chats and groups
- Background monitoring every 5 minutes

### 🎯 **Prediction Game**
- Daily ETH price prediction competition
- Leaderboard with top 3 winners
- Results announced at midnight
- Group and private chat support

### 🏢 **Group Support**
- Full functionality in Telegram groups
- User mentions in group notifications
- Interactive buttons work in groups
- Separate commands for group vs private use

## 🛠️ Setup

### 1. Prerequisites

- Node.js (>=18) or Bun
- Telegram Bot Token
- Etherscan API Key (free)
- Firebase project (for alerts & predictions)

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

3. **Setup Firebase (Optional but Recommended):**
   - Create a Firebase project
   - Enable Firestore Database
   - Generate service account key
   - Save as `serviceAccountKey.json`

4. **Update .env file:**
   ```env
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   ETHERSCAN_API_KEY=your_etherscan_api_key_here
   ```

### 4. Run the Bot

```bash
# Development with auto-restart
bun run dev

# Production
bun run start
```

## 📱 Commands

### **Private Chat Commands**
- `/start` - Complete market overview with interactive buttons
- `/price` - ETH price only
- `/gas` - Gas fees only
- `/alert <gwei>` - Set gas price alert (supports decimals)
- `/predict <price>` - Predict ETH price for tomorrow
- `/help` - Show help message

### **Group Commands**
- `/market` - Complete market data with buttons
- `/eth` - ETH price only
- `/gas` - Gas fees only
- `/alert <gwei>` - Set gas price alert (supports decimals)
- `/predict <price>` - Predict ETH price for tomorrow

## 🎮 Interactive Features

### **Quick Access Buttons**
- 📊 Market Data - Refresh market information
- 🔔 Set Alert - Prefill alert command
- 🎯 Predict - Prefill prediction command
- ❓ Help - Show help information

### **Prefill Commands**
- Click "Set Alert" → Input box prefills with `/alert `
- Click "Predict" → Input box prefills with `/predict `
- Just type your value and press Enter!

## 🔧 Technical Details

### **API Sources**
- **ETH Price:** CoinGecko API (primary) + Coinbase/Binance (fallback)
- **Gas Prices:** Etherscan API V2 (primary) + Polygon Gas Station/BlockNative (fallback)

### **Database (Firebase Firestore)**
- **Alerts Collection:** User gas price thresholds
- **Predictions Collection:** Daily price predictions
- **Leaderboards Collection:** Daily competition results

### **Background Jobs**
- **Gas Alert Checker:** Runs every 5 minutes
- **Daily Results:** Calculates winners at midnight

### **Error Handling**
- Multiple API fallbacks for reliability
- Markdown parsing protection
- Username escaping for special characters
- Comprehensive error logging

## 🚀 Advanced Features

### **Gas Alert System**
- Monitors Standard gas price (ProposeGasPrice)
- Triggers when gas drops **below** threshold
- Supports decimal values (e.g., 0.5, 15.7)
- Auto-deactivates after triggering

### **Prediction Game**
- Daily competition with leaderboard
- Closest guess wins
- Top 3 winners announced
- Historical data tracking

### **Group Integration**
- User mentions in notifications
- Context-aware messaging
- Interactive buttons in groups
- Admin permission handling

## 📊 Data Format

### **Gas Prices (3 decimal precision)**
```
Gas Prices (Gwei):
  - Safe:     0.295
  - Standard: 0.295
  - Fast:     0.325
```

### **Alert Examples**
```
/alert 15.5    # Alert when gas < 15.5 Gwei
/alert 0.8     # Alert when gas < 0.8 Gwei
```

### **Prediction Examples**
```
/predict 4500  # Predict $4500 for tomorrow
/predict 3200  # Predict $3200 for tomorrow
```

## 🔒 Security

- Environment variables for sensitive data
- Firebase service account key protection
- Username escaping for Markdown safety
- Input validation and sanitization

## 📁 Project Structure

```
eth-price-bot/
├── index.js              # Main bot logic
├── firebase.js           # Firebase configuration
├── package.json          # Dependencies
├── .env                  # Environment variables
├── .gitignore           # Git ignore rules
├── serviceAccountKey.json # Firebase credentials
└── README.md            # This file
```

## 🐛 Troubleshooting

### **Common Issues**
1. **Bot not responding in groups:** Make sure bot is admin
2. **Markdown errors:** Special characters in usernames are auto-escaped
3. **API failures:** Multiple fallback APIs ensure reliability
4. **Firebase errors:** Check service account key configuration

### **Debug Mode**
```bash
# Enable debug logging
DEBUG=* bun run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use and modify as needed.

## 🚀 Deployment

### **Production Setup**
1. Set up environment variables
2. Configure Firebase
3. Use PM2 or similar for process management
4. Set up monitoring and logging

### **Docker Support**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "start"]
```

---

**Built with ❤️ for the Ethereum community**
