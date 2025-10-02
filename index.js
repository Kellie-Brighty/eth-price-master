require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const cron = require("node-cron");
const db = require("./firebase");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Welcome command with improved formatting
// Group command for market data (works without mentioning bot)
bot.onText(/\/market/, async (msg) => {
  // Get both ETH price and gas prices
  const [ethPrice, gasData] = await Promise.all([
    getEthPrice(),
    getGasPrice()
  ]);

  let message = "*Ethereum Market Data*\n\n";

  if (ethPrice) {
    message += `*Price (USD):* $${ethPrice.toLocaleString()}\n`;
  } else {
    message += `*Price (USD):* Data unavailable\n`;
  }

  if (gasData) {
    message += `*Gas Prices (Gwei):*\n`;
    message += `  - Safe:     ${gasData.SafeGasPrice ? parseFloat(gasData.SafeGasPrice).toFixed(3) : "N/A"}\n`;
    message += `  - Standard: ${gasData.ProposeGasPrice ? parseFloat(gasData.ProposeGasPrice).toFixed(3) : "N/A"}\n`;
    message += `  - Fast:     ${gasData.FastGasPrice ? parseFloat(gasData.FastGasPrice).toFixed(3) : "N/A"}`;
  } else {
    message += `*Gas Prices:* Data unavailable`;
  }

  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📊 Market Data", callback_data: "refresh" }
        ],
        [
          { text: "🔔 Set Alert", switch_inline_query_current_chat: "/alert " },
          { text: "🎯 Predict", switch_inline_query_current_chat: "/predict " }
        ],
        [
          { text: "❓ Help", callback_data: "help" }
        ]
      ]
    }
  };

  bot.sendMessage(msg.chat.id, message, { parse_mode: "Markdown", ...options });
});

// Simple ETH price command for groups
bot.onText(/\/eth/, async (msg) => {
  const price = await getEthPrice();
  if (price) {
    const message = `*ETH Price:* $${price.toLocaleString()}`;
    bot.sendMessage(msg.chat.id, message, { parse_mode: "Markdown" });
  } else {
    bot.sendMessage(msg.chat.id, "*ETH Price:* Data unavailable", { parse_mode: "Markdown" });
  }
});

// Gas alert command (works for both groups and private chats)
bot.onText(/\/alert (.+)/, async (msg, match) => {
  const chatId = String(msg.chat.id);
  const threshold = parseFloat(match[1]);
  const userId = String(msg.from.id);
  const isGroup = msg.chat.type !== 'private';
  
  if (isNaN(threshold) || threshold <= 0 || threshold > 1000) {
    return bot.sendMessage(chatId, "*Gas Alert*\n\n❌ Please provide a valid number (0.1-1000).\n*Examples:* /alert 15 or /alert 0.97", { parse_mode: "Markdown" });
  }

  try {
    // Store alert with user ID and chat context
    await db.collection("alerts").doc(userId).set({
      user_id: userId,
      chat_id: isGroup ? chatId : userId, // Store group chat ID for group alerts, user ID for private
      gas_threshold: threshold,
      active: true,
      created_at: new Date(),
      username: msg.from.username || msg.from.first_name
    });

    // Different messages for group vs private
    if (isGroup) {
      const username = (msg.from.username || msg.from.first_name || 'User').replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
      bot.sendMessage(chatId, `*Gas Alert Set*\n\n🔔 @${username} will be notified when gas drops below ${threshold} GWEI.\n\n*Current gas:* Check with /gas command`, { parse_mode: "Markdown" });
    } else {
      bot.sendMessage(chatId, `*Gas Alert Set*\n\n🔔 You'll be notified when gas drops below ${threshold} GWEI.\n\n*Current gas:* Check with /gas command`, { parse_mode: "Markdown" });
    }
  } catch (error) {
    bot.sendMessage(chatId, "*Gas Alert*\n\n❌ Failed to set alert. Please try again.", { parse_mode: "Markdown" });
  }
});

// Gas price command for groups
bot.onText(/\/gas/, async (msg) => {
  const gas = await getGasPrice();
  if (gas) {
    const message = `*Gas Fee Tracker*\n\n*Current Gas Prices (Gwei):*\n  - Safe:     ${gas.SafeGasPrice ? parseFloat(gas.SafeGasPrice).toFixed(3) : "N/A"}\n  - Standard: ${gas.ProposeGasPrice ? parseFloat(gas.ProposeGasPrice).toFixed(3) : "N/A"}\n  - Fast:     ${gas.FastGasPrice ? parseFloat(gas.FastGasPrice).toFixed(3) : "N/A"}\n\n*Status:* Live network data`;
    bot.sendMessage(msg.chat.id, message, { parse_mode: "Markdown" });
  } else {
    bot.sendMessage(msg.chat.id, "*Gas Fee Tracker*\n\n*Status:* Data unavailable", { parse_mode: "Markdown" });
  }
});

// Prediction command (works for both groups and private chats)
bot.onText(/\/predict (.+)/, async (msg, match) => {
  const chatId = String(msg.chat.id);
  const guess = parseFloat(match[1]);
  const today = new Date().toISOString().slice(0, 10);
  const userId = String(msg.from.id);
  const isGroup = msg.chat.type !== 'private';

  if (isNaN(guess) || guess < 1) {
    return bot.sendMessage(chatId, "*Price Prediction*\n\n❌ Please enter a valid price (1-100000).\n*Example:* /predict 4500", { parse_mode: "Markdown" });
  }

  try {
    await db.collection("predictions").doc(today)
      .collection("predictions").doc(userId)
      .set({
        user_id: userId,
        chat_id: isGroup ? chatId : userId, // Store group chat ID for group predictions, user ID for private
        guess,
        timestamp: new Date(),
        username: msg.from.username || msg.from.first_name
      });

    // Different messages for group vs private
    if (isGroup) {
      const username = (msg.from.username || msg.from.first_name || 'User').replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
      bot.sendMessage(chatId, `*Prediction Recorded*\n\n✅ @${username} guessed $${guess} for ${today}\n\n*Good luck!* Results announced daily at midnight.`, { parse_mode: "Markdown" });
    } else {
      bot.sendMessage(chatId, `*Prediction Recorded*\n\n✅ Your guess: $${guess} for ${today}\n\n*Good luck!* Results announced daily at midnight.`, { parse_mode: "Markdown" });
    }
  } catch (error) {
    bot.sendMessage(chatId, "*Price Prediction*\n\n❌ Failed to record prediction. Please try again.", { parse_mode: "Markdown" });
  }
});

bot.onText(/\/start/, async (msg) => {
  // Only respond in private chats or when mentioned in groups
  if (msg.chat.type !== 'private' && !msg.text.includes('@' + bot.options.username)) {
    return;
  }
  
  // For groups, use the same format as /market
  if (msg.chat.type !== 'private') {
    // Get both ETH price and gas prices
    const [ethPrice, gasData] = await Promise.all([
      getEthPrice(),
      getGasPrice()
    ]);

    let message = "*Ethereum Market Data*\n\n";

    if (ethPrice) {
      message += `*Price (USD):* $${ethPrice.toLocaleString()}\n`;
    } else {
      message += `*Price (USD):* Data unavailable\n`;
    }

    if (gasData) {
      message += `*Gas Prices (Gwei):*\n`;
      message += `  - Safe:     ${gasData.SafeGasPrice ? parseFloat(gasData.SafeGasPrice).toFixed(3) : "N/A"}\n`;
      message += `  - Standard: ${gasData.ProposeGasPrice ? parseFloat(gasData.ProposeGasPrice).toFixed(3) : "N/A"}\n`;
      message += `  - Fast:     ${gasData.FastGasPrice ? parseFloat(gasData.FastGasPrice).toFixed(3) : "N/A"}`;
    } else {
      message += `*Gas Prices:* Data unavailable`;
    }

    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📊 Market Data", callback_data: "refresh" }
          ],
          [
            { text: "🔔 Set Alert", switch_inline_query_current_chat: "/alert " },
            { text: "🎯 Predict", switch_inline_query_current_chat: "/predict " }
          ],
          [
            { text: "❓ Help", callback_data: "help" }
          ]
        ]
      }
    };

    bot.sendMessage(msg.chat.id, message, { parse_mode: "Markdown", ...options });
    return;
  }
  // Get both ETH price and gas prices
  const [ethPrice, gasData] = await Promise.all([
    getEthPrice(),
    getGasPrice()
  ]);
  
  let message = "*Ethereum Market Data*\n\n";
  
  // ETH Price
  if (ethPrice) {
    message += `*Price (USD):* $${ethPrice.toLocaleString()}\n`;
  } else {
    message += `*Price (USD):* Data unavailable\n`;
  }
  
  // Gas Prices
  if (gasData) {
    message += `*Gas Prices (Gwei):*\n`;
    message += `  - Safe:     ${gasData.SafeGasPrice ? parseFloat(gasData.SafeGasPrice).toFixed(3) : "N/A"}\n`;
    message += `  - Standard: ${gasData.ProposeGasPrice ? parseFloat(gasData.ProposeGasPrice).toFixed(3) : "N/A"}\n`;
    message += `  - Fast:     ${gasData.FastGasPrice ? parseFloat(gasData.FastGasPrice).toFixed(3) : "N/A"}`;
  } else {
    message += `*Gas Prices:* Data unavailable`;
  }
  
  // Add interactive buttons with prefill functionality
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📊 Market Data", callback_data: "refresh" }
        ],
        [
          { text: "🔔 Set Alert", switch_inline_query_current_chat: "/alert " },
          { text: "🎯 Predict", switch_inline_query_current_chat: "/predict " }
        ],
        [
          { text: "❓ Help", callback_data: "help" }
        ]
      ]
    }
  };
  
  bot.sendMessage(msg.chat.id, message, { parse_mode: "Markdown", ...options });
});

// Fetch ETH Price using CoinGecko API
async function getEthPrice() {
  try {
    console.log("Fetching ETH price from CoinGecko...");
    const res = await axios.get("https://api.coingecko.com/api/v3/simple/price", {
      params: { ids: "ethereum", vs_currencies: "usd" },
    });
    
    console.log("CoinGecko API response:", JSON.stringify(res.data, null, 2));
    
    if (res.data && res.data.ethereum && res.data.ethereum.usd) {
      console.log("ETH price fetched successfully:", res.data.ethereum.usd);
      return res.data.ethereum.usd;
    } else {
      console.error("Invalid response structure from CoinGecko:", res.data);
      return await getEthPriceFallback();
    }
  } catch (err) {
    console.error("Error fetching ETH price from CoinGecko:", err.message);
    return await getEthPriceFallback();
  }
}

async function getEthPriceFallback() {
  try {
    console.log("Trying fallback ETH price API...");
    const res = await axios.get("https://api.coinbase.com/v2/exchange-rates?currency=ETH");
    
    if (res.data && res.data.data && res.data.data.rates && res.data.data.rates.USD) {
      const price = parseFloat(res.data.data.rates.USD);
      console.log("ETH price from Coinbase fallback:", price);
      return price;
    }
    
    // Try another fallback
    const res2 = await axios.get("https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT");
    if (res2.data && res2.data.price) {
      const price = parseFloat(res2.data.price);
      console.log("ETH price from Binance fallback:", price);
      return price;
    }
    
    console.error("All ETH price APIs failed");
    return null;
  } catch (err) {
    console.error("All fallback ETH price APIs failed:", err);
    return null;
  }
}

bot.onText(/\/price/, async (msg) => {
  const price = await getEthPrice();
  if (price) {
    const message = `*ETH Price Tracker*\n\n*Current Price:* $${price.toLocaleString()}\n*Status:* Live market data`;
    bot.sendMessage(msg.chat.id, message, { parse_mode: "Markdown" });
  } else {
    bot.sendMessage(msg.chat.id, "*ETH Price Tracker*\n\n*Status:* Data unavailable", { parse_mode: "Markdown" });
  }
});

// Fetch Gas Price using Etherscan API V2
async function getGasPrice() {
  try {
    const res = await axios.get("https://api.etherscan.io/v2/api?chainid=1", {
      params: {
        module: "gastracker",
        action: "gasoracle",
        apikey: process.env.ETHERSCAN_API_KEY,
      },
    });
    
    console.log("Etherscan API V2 response:", JSON.stringify(res.data, null, 2));
    
    // Check if the response is successful
    if (res.data.status === "1" && res.data.result) {
      return res.data.result;
    } else {
      console.error("Etherscan API V2 error:", res.data.message || "Unknown error");
      // Try fallback API
      return await getGasPriceFallback();
    }
  } catch (err) {
    console.error("Error fetching gas price:", err);
    // Try fallback API
    return await getGasPriceFallback();
  }
}

// Fallback gas price API using multiple sources
async function getGasPriceFallback() {
  try {
    console.log("Trying fallback gas price API...");
    
    // Try Polygon Gas Station API (free, no key required)
    const res = await axios.get("https://gasstation-mainnet.matic.network/v2");
    
    if (res.data && res.data.standard && res.data.fast && res.data.safeLow) {
      return {
        SafeGasPrice: Math.round(res.data.safeLow.maxFee), // Convert to gwei
        ProposeGasPrice: Math.round(res.data.standard.maxFee),
        FastGasPrice: Math.round(res.data.fast.maxFee)
      };
    }
    
    // If that fails, try another free API
    const res2 = await axios.get("https://api.blocknative.com/gasprice");
    if (res2.data && res2.data.blockPrices && res2.data.blockPrices[0]) {
      const prices = res2.data.blockPrices[0].estimatedPrices;
      return {
        SafeGasPrice: Math.round(prices[0].price / 1e9), // Convert wei to gwei
        ProposeGasPrice: Math.round(prices[1].price / 1e9),
        FastGasPrice: Math.round(prices[2].price / 1e9)
      };
    }
    
    return null;
  } catch (err) {
    console.error("All fallback gas price APIs failed:", err);
    return null;
  }
}

bot.onText(/\/gas/, async (msg) => {
  const gas = await getGasPrice();
  if (gas) {
    const message = `*Gas Fee Tracker*\n\n*Current Gas Prices (Gwei):*\n  - Safe:     ${gas.SafeGasPrice ? parseFloat(gas.SafeGasPrice).toFixed(3) : "N/A"}\n  - Standard: ${gas.ProposeGasPrice ? parseFloat(gas.ProposeGasPrice).toFixed(3) : "N/A"}\n  - Fast:     ${gas.FastGasPrice ? parseFloat(gas.FastGasPrice).toFixed(3) : "N/A"}\n\n*Status:* Live network data`;
    bot.sendMessage(msg.chat.id, message, { parse_mode: "Markdown" });
  } else {
    bot.sendMessage(msg.chat.id, "*Gas Fee Tracker*\n\n*Status:* Data unavailable", { parse_mode: "Markdown" });
  }
});



// Help command
bot.onText(/\/help/, (msg) => {
  const message = `*Ethereum Bot Commands*\n\n*Group Commands:*\n/market - Complete market data\n/eth - ETH price only\n/gas - Gas fees only\n/alert <gwei> - Set gas price alert (supports decimals)\n/predict <price> - Predict ETH price\n\n*Private Chat Commands:*\n/start - Complete market overview with buttons\n/price - ETH price only\n/gas - Gas fees only\n/alert <gwei> - Set gas price alert (supports decimals)\n/predict <price> - Predict ETH price\n/help - This help\n\n*Interactive Features:*\nUse buttons in private chat for quick access!`;
  
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📊 Market Data", callback_data: "refresh" }
        ],
        [
          { text: "🔔 Set Alert", switch_inline_query_current_chat: "/alert " },
          { text: "🎯 Predict", switch_inline_query_current_chat: "/predict " }
        ],
        [
          { text: "❓ Help", callback_data: "help" }
        ]
      ]
    }
  };
  
  bot.sendMessage(msg.chat.id, message, { parse_mode: "Markdown", ...options });
});

// Interactive button handlers
bot.on("callback_query", async (callbackQuery) => {
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  
  console.log("Callback query received:", callbackQuery.data, "in chat:", chatId, "type:", msg.chat.type);
  
  // Answer the callback query to remove loading state
  bot.answerCallbackQuery(callbackQuery.id);
  
  if (callbackQuery.data === "price") {
    const price = await getEthPrice();
    if (price) {
      const message = `*ETH Price Tracker*\n\n*Current Price:* $${price.toLocaleString()}\n*Status:* Live market data`;
      bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } else {
      bot.sendMessage(chatId, "*ETH Price Tracker*\n\n*Status:* Data unavailable", { parse_mode: "Markdown" });
    }
  }
  
  if (callbackQuery.data === "gas") {
    const gas = await getGasPrice();
    if (gas) {
      const message = `*Gas Fee Tracker*\n\n*Current Gas Prices (Gwei):*\n  - Safe:     ${gas.SafeGasPrice ? parseFloat(gas.SafeGasPrice).toFixed(3) : "N/A"}\n  - Standard: ${gas.ProposeGasPrice ? parseFloat(gas.ProposeGasPrice).toFixed(3) : "N/A"}\n  - Fast:     ${gas.FastGasPrice ? parseFloat(gas.FastGasPrice).toFixed(3) : "N/A"}\n\n*Status:* Live network data`;
      bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } else {
      bot.sendMessage(chatId, "*Gas Fee Tracker*\n\n*Status:* Data unavailable", { parse_mode: "Markdown" });
    }
  }
  
  if (callbackQuery.data === "refresh") {
    try {
      // Get both ETH price and gas prices
      const [ethPrice, gasData] = await Promise.all([
        getEthPrice(),
        getGasPrice()
      ]);
      
      let message = "*Ethereum Market Data*\n\n";
      
      // ETH Price
      if (ethPrice) {
        message += `*Price (USD):* $${ethPrice.toLocaleString()}\n`;
      } else {
        message += `*Price (USD):* Data unavailable\n`;
      }
      
      // Gas Prices
      if (gasData) {
        message += `*Gas Prices (Gwei):*\n`;
        message += `  - Safe:     ${gasData.SafeGasPrice ? parseFloat(gasData.SafeGasPrice).toFixed(3) : "N/A"}\n`;
        message += `  - Standard: ${gasData.ProposeGasPrice ? parseFloat(gasData.ProposeGasPrice).toFixed(3) : "N/A"}\n`;
        message += `  - Fast:     ${gasData.FastGasPrice ? parseFloat(gasData.FastGasPrice).toFixed(3) : "N/A"}`;
      } else {
        message += `*Gas Prices:* Data unavailable`;
      }
      
      const options = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "📊 Market Data", callback_data: "refresh" }
            ],
            [
              { text: "🔔 Set Alert", switch_inline_query_current_chat: "/alert " },
              { text: "🎯 Predict", switch_inline_query_current_chat: "/predict " }
            ],
            [
              { text: "❓ Help", callback_data: "help" }
            ]
          ]
        }
      };
      
      await bot.sendMessage(chatId, message, { parse_mode: "Markdown", ...options });
    } catch (error) {
      console.error("Error in refresh callback:", error);
      bot.sendMessage(chatId, "*Error:* Unable to fetch market data. Please try again.", { parse_mode: "Markdown" });
    }
  }
  
  if (callbackQuery.data === "alert") {
    const message = `*Gas Alert Setup*\n\n🔔 Set a gas price alert to get notified when gas drops below your threshold.\n\n*Quick Setup:*\n1. Click "🔔 Set Alert" button below\n2. Type your desired gas threshold (e.g., 15 or 0.97)\n3. Press Enter\n\n*You'll be notified when gas drops below your set threshold.*`;
    
    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🔔 Set Alert", switch_inline_query_current_chat: "/alert " }
          ],
          [
            { text: "📊 Check Current Gas", callback_data: "gas" }
          ]
        ]
      }
    };
    
    bot.sendMessage(chatId, message, { parse_mode: "Markdown", ...options });
  }
  
  if (callbackQuery.data === "predict") {
    const message = `*Price Prediction Game*\n\n🎯 Predict tomorrow's ETH price and compete with other users!\n\n*Quick Setup:*\n1. Click "🎯 Predict" button below\n2. Type your price prediction (e.g., 4500)\n3. Press Enter\n\n*Daily results announced at midnight. Closest guess wins!*`;
    
    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🎯 Predict", switch_inline_query_current_chat: "/predict " }
          ],
          [
            { text: "📊 Check Current Price", callback_data: "price" }
          ]
        ]
      }
    };
    
    bot.sendMessage(chatId, message, { parse_mode: "Markdown", ...options });
  }
  
  
  if (callbackQuery.data === "help") {
    try {
      const message = `*Ethereum Bot Commands*\n\n*Group Commands:*\n/market - Complete market data\n/eth - ETH price only\n/gas - Gas fees only\n/alert <gwei> - Set gas price alert (supports decimals)\n/predict <price> - Predict ETH price\n\n*Private Chat Commands:*\n/start - Complete market overview with buttons\n/price - ETH price only\n/gas - Gas fees only\n/alert <gwei> - Set gas price alert (supports decimals)\n/predict <price> - Predict ETH price\n/help - This help\n\n*Interactive Features:*\nUse buttons for quick access!`;
      await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("Error in help callback:", error);
      bot.sendMessage(chatId, "*Error:* Unable to send help message. Please try again.", { parse_mode: "Markdown" });
    }
  }
});

// Error handling
bot.on("error", (error) => {
  console.error("Bot error:", error);
});

bot.on("polling_error", (error) => {
  console.error("Polling error:", error);
});

// Background Jobs

// Gas Alert Checker - runs every 5 minutes
// Uses STANDARD gas price (ProposeGasPrice) for alert comparison
cron.schedule("*/5 * * * *", async () => {
  try {
    const gasData = await getGasPrice();
    if (!gasData) return;

    const currentGas = parseFloat(gasData.ProposeGasPrice); // Standard gas price
    if (isNaN(currentGas)) return;

    const snap = await db.collection("alerts").where("active", "==", true).get();

    snap.forEach(async (doc) => {
      const { user_id, gas_threshold, chat_id, username } = doc.data();
      if (currentGas < gas_threshold) {
        try {
          // Check if it's a group alert (has chat_id) or private alert
          if (chat_id && chat_id !== user_id) {
            // Group alert - mention user and send to group
            const safeUsername = (username || 'User').replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
            await bot.sendMessage(chat_id, `*Gas Alert Triggered!*\n\n✅ @${safeUsername} - Gas is now ${currentGas.toFixed(3)} GWEI (below your alert ${gas_threshold} GWEI)\n\n*Alert deactivated.*`, { parse_mode: "Markdown" });
          } else {
            // Private alert
            await bot.sendMessage(user_id, `*Gas Alert Triggered!*\n\n✅ Gas is now ${currentGas.toFixed(3)} GWEI (below your alert ${gas_threshold} GWEI)\n\n*Alert deactivated.*`, { parse_mode: "Markdown" });
          }
          // Deactivate alert after sending
          await db.collection("alerts").doc(user_id).update({ active: false });
        } catch (error) {
          console.error("Failed to send alert to user:", user_id, error.message);
        }
      }
    });
  } catch (error) {
    console.error("Gas alert checker error:", error);
  }
});

// Daily Prediction Results - runs at midnight
cron.schedule("0 0 * * *", async () => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // Get actual ETH price
    const priceRes = await axios.get("https://api.coingecko.com/api/v3/simple/price", {
      params: { ids: "ethereum", vs_currencies: "usd" },
    });
    const actualPrice = priceRes.data.ethereum.usd;

    const snap = await db.collection("predictions").doc(today).collection("predictions").get();

    if (snap.empty) {
      console.log("No predictions found for", today);
      return;
    }

    let results = [];
    snap.forEach(doc => {
      const { guess, username, chat_id } = doc.data();
      const diff = Math.abs(guess - actualPrice);
      results.push({ user_id: doc.id, guess, diff, username, chat_id });
    });

    results.sort((a, b) => a.diff - b.diff);
    const winners = results.slice(0, 3);

    // Save leaderboard
    await db.collection("leaderboards").doc(today).set({
      date: today,
      actualPrice,
      winners,
      totalParticipants: results.length
    });

    // Announce results to winners
    winners.forEach((w, i) => {
      const position = i + 1;
      const medal = position === 1 ? "🥇" : position === 2 ? "🥈" : "🥉";
      
      // Check if it's a group prediction (has chat_id) or private prediction
      if (w.chat_id && w.chat_id !== w.user_id) {
        // Group prediction - send to group with mention
        const safeUsername = (w.username || 'User').replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
        const message = `*Daily Prediction Results*\n\n${medal} *@${safeUsername} placed #${position}!*\n\n*Actual Price:* $${actualPrice}\n*Guess:* $${w.guess}\n*Difference:* $${w.diff.toFixed(2)}\n\n*Great job!* 🎉`;
        
        bot.sendMessage(w.chat_id, message, { parse_mode: "Markdown" }).catch(error => {
          console.error("Failed to send result to group:", w.chat_id, error.message);
        });
      } else {
        // Private prediction
        const message = `*Daily Prediction Results*\n\n${medal} *You placed #${position}!*\n\n*Actual Price:* $${actualPrice}\n*Your Guess:* $${w.guess}\n*Difference:* $${w.diff.toFixed(2)}\n\n*Great job!* 🎉`;
        
        bot.sendMessage(w.user_id, message, { parse_mode: "Markdown" }).catch(error => {
          console.error("Failed to send result to user:", w.user_id, error.message);
        });
      }
    });

    console.log(`Daily prediction results calculated for ${today}. Actual: $${actualPrice}, Winners: ${winners.length}`);
  } catch (error) {
    console.error("Daily prediction results error:", error);
  }
});


// Welcome message for new users
bot.onText(/\/welcome/, (msg) => {
  const message = `*Welcome to ETH Bot! 🚀*\n\n*Quick Start Guide:*\n\n*📊 Market Data:* Get real-time ETH prices and gas fees\n*🔔 Gas Alerts:* Get notified when gas drops below your threshold\n*🎯 Predictions:* Compete in daily price prediction game\n\n*How to Use:*\n1. Click buttons below for instant actions\n2. Use prefill buttons for quick setup\n3. No need to remember commands!\n\n*Ready to get started?*`;
  
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📊 Market Data", callback_data: "refresh" },
          { text: "❓ Help", callback_data: "help" }
        ],
        [
          { text: "🔔 Set Alert", switch_inline_query_current_chat: "/alert " },
          { text: "🎯 Predict", switch_inline_query_current_chat: "/predict " }
        ]
      ]
    }
  };
  
  bot.sendMessage(msg.chat.id, message, { parse_mode: "Markdown", ...options });
});

console.log("🤖 ETH Price & Gas Bot is running...");
console.log("📊 Features: Price tracking, Gas alerts, Prediction game");
console.log("⏰ Background jobs: Gas alerts (5min), Daily results (midnight)");
console.log("🔧 Make sure to set your TELEGRAM_BOT_TOKEN and ETHERSCAN_API_KEY in the .env file");
console.log("🔥 Firebase features ready! Add serviceAccountKey.json for full functionality");
console.log("✨ Enhanced UX: Prefill buttons for smooth user experience");
