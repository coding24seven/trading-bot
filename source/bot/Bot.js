import eventBus from "../events/eventBus.js";
import store from "../store/Store.js";
import Trader from "../trader/Trader.js";

export default class Bot {
  data = null;
  id = null;
  itsAccountId = null;
  hands = [];
  trader = {};
  lastPrice = null;
  lowestPriceRecorded = Infinity;
  highestPriceRecorded = -Infinity;
  buyCountTotal = 0;
  sellCountTotal = 0;
  count = 0;
  tradeHistory = []; // not added to store atm

  constructor(data) {
    this.data = data;
    this.id = data.config.id;
    this.itsAccountId = data.config.itsAccountId;
    this.hands = data.vars.hands;
    this.trader = new Trader(
      data.config.itsAccountId,
      data.config.pair,
      store.getExchangeFee(this.itsAccountId)
    );
    eventBus.on(eventBus.events.LAST_PRICE, this.onLastPrice.bind(this));
    eventBus.on(
      eventBus.events.HISTORICAL_PRICE_READER_FINISHED,
      this.onHistoricalPriceReaderFinished.bind(this)
    );
  }

  onHistoricalPriceReaderFinished() {
    store.setResults(this.itsAccountId, this.id, this.getResults());

    eventBus.emit(
      eventBus.events.BOT_DONE_PROCESSING_HISTORICAL_PRICES,
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
    const quoteTotal = this.hands.reduce(
      (accumulator, item) => accumulator + item.quote,
      0
    );

    const baseTotal = this.hands.reduce(
      (accumulator, item) => accumulator + item.base,
      0
    );

    const baseAtLastPriceToQuoteTotal = baseTotal * this.lastPrice;
    const pairTotal = quoteTotal + baseAtLastPriceToQuoteTotal;
    const quoteTotalIncludingBaseSoldAsPlanned = this.getQuoteTotalIncludingBaseSoldAsPlanned();

    return {
      quoteTotal,
      baseTotal,
      baseAtLastPriceToQuoteTotal,
      pairTotal,
      quoteTotalIncludingBaseSoldAsPlanned,
      buyCountTotal: this.buyCountTotal,
      sellCountTotal: this.sellCountTotal,
      lastPrice: this.lastPrice,
      lowestPriceRecorded: this.lowestPriceRecorded,
      highestPriceRecorded: this.highestPriceRecorded,
    };
  }

  onLastPrice(pairs) {
    const pair = pairs[this.data.config.pair];

    if (!pair) return;

    const lastPrice = parseFloat(pair.close);

    if (isNaN(lastPrice)) {
      console.log(`${lastPrice} is not a number`);
      return;
    }

    this.lastPrice = lastPrice;
    this.recordLowestAndHighestPrice(lastPrice);

    if (!store.isHistoricalPrice) {
      // console.log(lastPrice);
    }

    const buyingHands = this.hands.filter(
      (hand) => !hand.bought && lastPrice < hand.buyBelow
    );

    buyingHands.forEach((hand) => {
      this.buy(hand, lastPrice);
    });

    const sellingHands = this.hands.filter(
      (hand) => hand.bought && lastPrice > hand.sellAbove
    );

    sellingHands.forEach((hand) => {
      this.sell(hand, lastPrice);
    });
  }

  // todo: fix so the properties are not modified via a parameter
  buy(hand, lastPrice) {
    const buyMethod = store.isHistoricalPrice
      ? this.trader.buyFake
      : this.trader.buy;

    buyMethod.call(this.trader, hand, lastPrice);
    // await for the buy result promise

    hand.buyCount++;
    this.buyCountTotal++;
    this.tradeHistory.push({
      id: hand.id,
      buyBelow: hand.buyBelow,
      sellAbove: hand.sellAbove,
      buyCount: hand.buyCount,
      sellCount: hand.sellCount,
      lastPrice,
      type: "buy",
    });

    if (store.isHistoricalPrice) return;

    this.storeCurrentResultsAndConsoleLogThem();
  }

  sell(hand, lastPrice) {
    const sellMethod = store.isHistoricalPrice
      ? this.trader.sellFake
      : this.trader.sell;

    sellMethod.call(this.trader, hand, lastPrice);
    // await for the sell result promise

    hand.sellCount++;
    this.sellCountTotal++;
    this.tradeHistory.push({
      id: hand.id,
      buyBelow: hand.buyBelow,
      sellAbove: hand.sellAbove,
      buyCount: hand.buyCount,
      sellCount: hand.sellCount,
      lastPrice,
      type: "sell",
    });

    if (store.isHistoricalPrice) return;

    this.storeCurrentResultsAndConsoleLogThem();
  }

  storeCurrentResultsAndConsoleLogThem() {
    store.setResults(this.itsAccountId, this.id, this.getResults());
    console.log(this.getConfigAndResultsAndTradeHistory());
  }

  getQuoteTotalIncludingBaseSoldAsPlanned() {
    const arr = JSON.parse(JSON.stringify(this.hands));

    arr.forEach((hand) => {
      if (hand.base > 0) {
        hand.quote += hand.base * hand.sellAbove;
        hand.base = 0;
      }
    });

    return arr.reduce((accumulator, item) => accumulator + item.quote, 0);
  }

  recordLowestAndHighestPrice(lastPrice) {
    this.lowestPriceRecorded =
      lastPrice < this.lowestPriceRecorded
        ? lastPrice
        : this.lowestPriceRecorded;

    this.highestPriceRecorded =
      lastPrice > this.highestPriceRecorded
        ? lastPrice
        : this.highestPriceRecorded;
  }
}
