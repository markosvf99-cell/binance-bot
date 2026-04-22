require('dotenv').config();
const ccxt = require('ccxt');
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN);

process.on('SIGINT', () => { console.log('\n🛑 Parando...'); process.exit(); });

const binance = new ccxt.binance({
  apiKey: process.env.APIKEY,
  secret: process.env.APISECRET,
  sandbox: true,
  rateLimit: 1000  // Evita ban API
});
// TELEGRAM BOT  ← ADICIONE TODO ESTE BLOCO (LINHAS 12-15)
const teleBot = new TelegramBot(process.env.TELEGRAM_TOKEN, {polling: false});
function alerta(msg) {
  teleBot.sendMessage(process.env.CHAT_ID, `🤖 *BinanceBot*\n\`\`\`${msg}\`\`\`` , {parse_mode: 'Markdown'});
}

let trades = 0;
async function smartTrade() {
  try {
    const {last, high, low} = await binance.fetchTicker('BTC/USDT');
    
    console.clear();
    console.log(`📊 BTC: $${last} | Trades: ${trades}`);
    
    // Estratégia SUPORTE/RESISTÊNCIA
    if (last < 65000 && trades < 5) {  // Suporte
      await binance.createMarketBuyOrder('BTC/USDT', 0.001);
      trades++;
      console.log(`🟢 COMPRA #${trades} em $${last}`);
    } else if (last > 65500) {  // Resistência
      await binance.createMarketSellOrder('BTC/USDT', 0.001);
      console.log(`🔴 VENDA PROFIT em $${last}`);
      trades = 0;
    }
  } catch(e) {
    console.log('⏳ Rate limit, espera...');
  }
}

setInterval(smartTrade, 20000);
smartTrade();