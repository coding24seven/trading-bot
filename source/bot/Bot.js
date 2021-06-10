import Reporter from "../reporter/Reporter.js";
import eventBus from "../events/eventBus.js";
import store from "../store/Store.js";
import Trader from "../trader/trader.js";

export default class Bot {
  data = null;
  id = null;
  itsAccountId = null;
  brackets = [];
  trader = {};
  reporter = null;
  lastPrice = null;
  buyCountTotal = 0;
  sellCountTotal = 0;
  count = 0;
  tradeHistory = []; // not added to store atm

  constructor(data) {
    this.data = data;
    this.id = data.config.id;
    this.itsAccountId = data.config.itsAccountId;
    this.brackets = data.vars.brackets;
    this.trader = new Trader(
      data.config.itsAccountId,
      data.config.pair,
      store.getExchangeFee(this.itsAccountId)
    );
    this.reporter = new Reporter(data);
    eventBus.on(eventBus.events.LAST_PRICE, this.onLastPrice.bind(this));
    eventBus.on(
      eventBus.events.END_OF_OFFLINE_PRICE_STREAM,
      this.onEndOfOfflinePriceStream.bind(this)
    );
  }

  onEndOfOfflinePriceStream() {
    store.setResults(this.itsAccountId, this.id, this.getResults());

    // this.reporter.logConfig();
    // this.reporter.logHistoricalDataResults(
    //   store.getResults(this.itsAccountId, this.id)
    // );

    eventBus.emit(
      eventBus.events.BOT_FINISHED,
      this.getConfigAndResultsAndTradeHistory()
    );
  }

  getConfigAndResultsAndTradeHistory() {
    return {
      tradeHistory: this.tradeHistory,
      config: this.data.config,
      results: store.getResults(this.itsAccountId, this.id),
    };
  }

  getResults() {
    const quoteTotal = this.brackets.reduce(
      (accumulator, item) => accumulator + item.quote,
      0
    );

    const baseTotal = this.brackets.reduce(
      (accumulator, item) => accumulator + item.base,
      0
    );

    const baseAtLastPriceToQuoteTotal = baseTotal * this.lastPrice;
    const pairTotal = quoteTotal + baseAtLastPriceToQuoteTotal;
    const quoteTotalIncludingBaseSoldAsPlanned = this.getQuoteTotalIncludingBaseSoldAsPlanned();

    return {
      currentPrice: this.lastPrice,
      quoteTotal,
      baseTotal,
      baseAtLastPriceToQuoteTotal,
      pairTotal,
      quoteTotalIncludingBaseSoldAsPlanned,
      buyCountTotal: this.buyCountTotal,
      sellCountTotal: this.sellCountTotal,
    };
  }

  onLastPrice(pairs) {
    const pair = pairs[this.data.config.pair];

    if (!pair) return;

    const lastPrice = parseFloat(pair.close);

    if (isNaN(lastPrice)) {
      this.reporter.logError(`${lastPrice} is not a number`);
      return;
    }

    this.lastPrice = lastPrice;
    // console.log("last price", lastPrice);

    const bracketWithBuyZoneHit = this.brackets.find(
      (item) => lastPrice >= item.buyFrom && lastPrice <= item.buyTo
    );

    if (bracketWithBuyZoneHit && bracketWithBuyZoneHit.bought) {
      return; // not buying again
    } else if (bracketWithBuyZoneHit) {
      this.buy(bracketWithBuyZoneHit, lastPrice);
      return;
    }

    const bracketWithSellZoneHit = this.brackets.find(
      (item) => lastPrice >= item.sellFrom && lastPrice <= item.sellTo
    );

    if (bracketWithSellZoneHit && bracketWithSellZoneHit.bought) {
      this.sell(bracketWithSellZoneHit, lastPrice);
    }
  }

  // todo: fix so the properties are not modified via a parameter
  buy(bracket, lastPrice) {
    const buyMethod = store.isHistoricalPrice
      ? this.trader.buyFake
      : this.trader.buy;

    buyMethod.call(this.trader, bracket, lastPrice);
    // await for the buy result promise
    this.tradeHistory.push({ lastPrice, type: "buy" });
    bracket.buyCount++;
    this.buyCountTotal++;
    store.setResults(this.itsAccountId, this.id, this.getResults());

    console.log(this.getConfigAndResultsAndTradeHistory());
  }

  sell(bracket, lastPrice) {
    const sellMethod = store.isHistoricalPrice
      ? this.trader.sellFake
      : this.trader.sell;

    sellMethod.call(this.trader, bracket, lastPrice);
    // await for the sell result promise
    this.tradeHistory.push({ lastPrice, type: "sell" });
    bracket.sellCount++;
    this.sellCountTotal++;
    store.setResults(this.itsAccountId, this.id, this.getResults());

    console.log(this.getConfigAndResultsAndTradeHistory());
  }

  getQuoteTotalIncludingBaseSoldAsPlanned() {
    const arr = JSON.parse(JSON.stringify(this.brackets));

    arr.forEach((bracket) => {
      if (bracket.base > 0) {
        bracket.quote += bracket.base * bracket.sellFrom;
        bracket.base = 0;
      }
    });

    return arr.reduce((accumulator, item) => accumulator + item.quote, 0);
  }
}
