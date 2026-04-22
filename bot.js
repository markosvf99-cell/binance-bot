require('dotenv').config();
const ccxt = require('ccxt');
const TelegramBot = require('node-telegram-bot-api');

const binance = new ccxt.binance({
  apiKey: process.env.APIKEY,
  secret: process.env.APISECRET,
  sandbox: true,  // false = DINHEIRO REAL
  options: { defaultType: 'spot' }
});

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: false });
let position = 0; // 0=nada, 1=long
let trades = 0;
let totalProfit = 0;

async function smartTrade() {
  try {
    const ticker = await binance.fetchTicker('BTC/USDT');
    const candles = await binance.fetchOHLCV('BTC/USDT', '1m', undefined, 14);
    
    // RSI 14 períodos
    const rsi = calculateRSI(candles.map(c => c[4]));
    
    const preco = ticker.last;
    console.log(`💰 BTC: $${preco.toFixed(2)} | 📊 RSI: ${rsi.toFixed(2)} | Posição: ${position ? 'LONG' : 'NEUTRO'} | Trades: ${trades}`);
    
    // COMPRA: RSI < 30 (sobrevenda)
    if (!position && rsi < 30) {
      await binance.createMarketBuyOrder('BTC/USDT', 0.001);
      position = 1;
      trades++;
      bot.sendMessage(process.env.CHAT_ID, `🟢 COMPRA BTC $${preco.toFixed(2)} | RSI: ${rsi.toFixed(2)} | Trade #${trades}`);
    }
    
    // VENDA: RSI > 70 OU Stop Loss 2%
    if (position && (rsi > 70 || preco < entryPrice * 0.98)) {
      const order = await binance.createMarketSellOrder('BTC/USDT', 0.001);
      position = 0;
      const lucro = preco - entryPrice;
      totalProfit += lucro;
      bot.sendMessage(process.env.CHAT_ID, `🔴 VENDA BTC $${preco.toFixed(2)} | Lucro: $${lucro.toFixed(2)} | Total: $${totalProfit.toFixed(2)}`);
    }
    
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

function calculateRSI(prices) {
  let gains = 0, losses = 0;
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i-1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / 14;
  const avgLoss = losses / 14;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Executa a cada 30s
setInterval(smartTrade, 30000);
smartTrade(); // Primeira execução
