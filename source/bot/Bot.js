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
  buyResetCount = 0;
  sellResetCount = 0;
  count = 0;
  onLastPriceHasRunAtLeastOnce = false;
  tradeHistory = []; // not added to store atm
  letRunnersRun = process.argv.includes("lrr");

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
      hands: this.hands,
      // tradeHistory: this.tradeHistory,
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
      buyResetCount: this.buyResetCount,
      sellResetCount: this.sellResetCount,
      lastPrice: this.lastPrice,
      lowestPriceRecorded: this.lowestPriceRecorded,
      highestPriceRecorded: this.highestPriceRecorded,
    };
  }

  onLastPrice(pairs) {
    const pair = pairs[this.data.config.pair];

    if (!pair || !pair.close) return;

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

    if (this.letRunnersRun) {
      this.processLastPriceLettingRunnersRun(lastPrice);
    } else {
      this.processLastPriceStandard(lastPrice);
    }
  }

  quoteCurrencyIsAvailable(hand, minTransactionValueRequiredByExchange) {
    // return hand.quote >= minTransactionValueRequiredByExchange;
    return hand.quote > 0;
  }

  baseCurrencyIsAvailable(hand, minTransactionValueRequiredByExchange) {
    // return hand.base * this.lastPrice >= minTransactionValueRequiredByExchange;
    return hand.base > 0;
  }

  processLastPriceStandard(lastPrice) {
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

  processLastPriceLettingRunnersRun(lastPrice) {
    const minTransactionValueRequiredByExchange = 0.000001; // todo: actually it is > 10 USDT

    if (!this.onLastPriceHasRunAtLeastOnce) {
      this.hands.forEach((hand) => {
        if (
          this.quoteCurrencyIsAvailable(
            hand,
            minTransactionValueRequiredByExchange
          ) &&
          lastPrice < hand.buyBelow
        ) {
          // console.log("first run buy by hand", hand.id, "at", lastPrice);
          this.buy(hand, lastPrice);
        }
      });

      this.onLastPriceHasRunAtLeastOnce = true;

      return;
    }

    const stepPercent = 0.001; // temp

    this.hands
      .filter((hand) => hand.readyToBuy)
      .forEach((hand) => {
        if (
          !this.quoteCurrencyIsAvailable(
            hand,
            minTransactionValueRequiredByExchange
          )
        ) {
          // hand has no quote - do nothing
        } else if (lastPrice > hand.stopBuy && lastPrice < hand.sellAbove) {
          this.buy(hand, lastPrice);
          // console.log(lastPrice, "stop buy triggered on hand", hand.id);
          // hand.bought = true; // if bought successfully
          hand.readyToBuy = false; // if bought successfully
          hand.stopBuy = hand.buyBelow;
        } else if (hand.stopBuy - lastPrice > hand.stopBuy * stepPercent) {
          hand.stopBuy -= (hand.stopBuy - lastPrice) / 2;
          this.buyResetCount++;
          // console.log(
          //   lastPrice,
          //   "stop buy on hand",
          //   hand.id,
          //   "reset to",
          //   hand.stopBuy
          // );
        }
      });

    this.hands.forEach((hand) => {
      if (
        !this.quoteCurrencyIsAvailable(
          hand,
          minTransactionValueRequiredByExchange
        )
      ) {
        // hand has no quote - do nothing
      } else if (!hand.readyToBuy && lastPrice < hand.buyBelow) {
        // console.log("marking hand", hand.id, "ready to buy, at", lastPrice);
        hand.readyToBuy = true;
      }
    });

    this.hands
      .filter((hand) => hand.readyToSell)
      .forEach((hand) => {
        if (
          !this.baseCurrencyIsAvailable(
            hand,
            minTransactionValueRequiredByExchange
          )
        ) {
          // hand has no base - do nothing
        } else if (lastPrice < hand.stopSell && lastPrice > hand.buyBelow) {
          this.sell(hand, lastPrice);
          // console.log("stop sell triggered on hand", hand.id, "at", lastPrice);
          // hand.bought = false; // if sold successfully
          hand.readyToSell = false; // if sold successfully
          hand.stopSell = hand.sellAbove;
        } else if (lastPrice - hand.stopSell > hand.stopSell * stepPercent) {
          hand.stopSell += (lastPrice - hand.stopSell) / 2;
          this.sellResetCount++;
          // console.log(
          //   "stop sell on hand",
          //   hand.id,
          //   "reset to",
          //   hand.stopSell,
          //   "at",
          //   lastPrice
          // );
        }
      });

    this.hands.forEach((hand) => {
      if (
        !this.baseCurrencyIsAvailable(
          hand,
          minTransactionValueRequiredByExchange
        )
      ) {
        // hand has no base - do nothing
      } else if (!hand.readyToSell && lastPrice > hand.sellAbove) {
        hand.readyToSell = true;
        // console.log("marking hand", hand.id, "ready to sell, at", lastPrice);
      }
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
