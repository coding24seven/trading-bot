import eventBus from "../events/eventBus.js";
import store from "../store/Store.js";
import Trader from "../trader/Trader.js";
import {
  BotData,
  BotDataWithResults,
  BotHand,
  BotResults,
  PairTradeSizes,
  TradeHistoryItem,
} from "../types";
import { Exchange } from "../exchange/Exchange.js";
import Messages from "../types/messages.js";

export default class Bot {
  data: BotData | null = null;
  id: number | null = null;
  itsAccountId: number | null = null;
  hands: BotHand[] = [];
  trader: Trader;
  symbol: string; // i.e. 'BTC-USDT'
  lastPrice: number | null = null;
  lowestPriceRecorded: number = Infinity;
  highestPriceRecorded: number = -Infinity;
  buyCountTotal: number = 0;
  sellCountTotal: number = 0;
  buyResetCount: number = 0;
  sellResetCount: number = 0;
  count: number = 0;
  onLastPriceHasRunAtLeastOnce: boolean = false;
  tradeHistory: TradeHistoryItem[] = []; // not added to store atm
  letRunnersRun: boolean = process.argv.includes("lrr");
  minimumBaseTradeSizeAllowed: number | null = null;
  minimumQuoteTradeSizeAllowed: number | null = null;

  constructor(data: BotData) {
    this.data = data;
    this.id = data.config.id;
    this.itsAccountId = data.config.itsAccountId;
    this.hands = data.vars.hands;
    this.symbol = data.config.pair;
    this.trader = new Trader(
      data.config.itsAccountId!,
      data.config.pair,
      store.getExchangeFee(this.itsAccountId)!
    );
    eventBus.on(eventBus.events!.LAST_PRICE, this.onLastPrice.bind(this));
    eventBus.on(
      eventBus.events!.HISTORICAL_PRICE_READER_FINISHED,
      this.onHistoricalPriceReaderFinished.bind(this)
    );
  }

  onHistoricalPriceReaderFinished() {
    store.setResults(this.itsAccountId, this.id, this.getResults());

    eventBus.emit(
      eventBus.events!.BOT_DONE_PROCESSING_HISTORICAL_PRICES,
      this.getBotDataWithResults()
    );
  }

  getBotDataWithResults(
    options: { tradeHistoryIncluded: boolean } | null = null
  ): BotDataWithResults {
    let tradeHistoryIncluded: boolean = false;

    if (options) {
      tradeHistoryIncluded = options.tradeHistoryIncluded;
    }

    return {
      hands: this.hands,
      ...(tradeHistoryIncluded && { tradeHistory: this.tradeHistory }),
      config: this.data!.config,
      results: store.getResults(this.itsAccountId, this.id),
    };
  }

  getResults(): BotResults | undefined {
    if (!this.lastPrice) {
      return;
    }

    const quoteTotal: number = this.hands.reduce(
      (accumulator: number, item: BotHand) => accumulator + item.quote,
      0
    );

    const baseTotal: number = this.hands.reduce(
      (accumulator: number, item: BotHand) => accumulator + item.base,
      0
    );

    const baseAtLastPriceToQuoteTotal: number = baseTotal * this.lastPrice;
    const pairTotal: number = quoteTotal + baseAtLastPriceToQuoteTotal;
    const quoteTotalIncludingBaseSoldAsPlanned: number = this.getQuoteTotalIncludingBaseSoldAsPlanned();

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

  async onLastPrice(lastPrice: number) {
    this.lastPrice = lastPrice;
    this.recordLowestAndHighestPrice(lastPrice);

    if (!this.onLastPriceHasRunAtLeastOnce) {
      await this.setMinimumTradeSizes();
    }

    if (this.letRunnersRun) {
      this.processLastPriceLettingRunnersRun(lastPrice);
    } else {
      this.processLastPriceStandard(lastPrice);
    }

    this.onLastPriceHasRunAtLeastOnce = true;
  }

  async setMinimumTradeSizes() {
    const minimumTradeSizes: PairTradeSizes | null = await Exchange.getMinimumTradeSizes(
      this.symbol
    );

    if (!minimumTradeSizes) {
      throw new Error(Messages.EXCHANGE_MINIMUM_TRADE_SIZES_RESPONSE_FAILED);
    }

    this.minimumBaseTradeSizeAllowed = minimumTradeSizes.base;
    this.minimumQuoteTradeSizeAllowed = minimumTradeSizes.quote;
  }

  baseCurrencyIsEnoughToTrade(hand: BotHand): boolean {
    if (!this.minimumBaseTradeSizeAllowed) {
      throw new Error(Messages.MINIMUM_ALLOWED_TRADE_SIZES_NOT_SET);
    }

    return hand.base * this.lastPrice! >= this.minimumBaseTradeSizeAllowed;
  }

  quoteCurrencyIsEnoughToTrade(hand: BotHand): boolean {
    if (!this.minimumQuoteTradeSizeAllowed) {
      throw new Error(Messages.MINIMUM_ALLOWED_TRADE_SIZES_NOT_SET);
    }

    return hand.quote >= this.minimumQuoteTradeSizeAllowed;
  }

  processLastPriceStandard(lastPrice: number) {
    const buyingHands: BotHand[] = this.hands.filter(
      (hand: BotHand) =>
        this.quoteCurrencyIsEnoughToTrade(hand) && lastPrice < hand.buyBelow
    );

    buyingHands.forEach((hand: BotHand) => {
      this.buy(hand, lastPrice);
    });

    const sellingHands: BotHand[] = this.hands.filter(
      (hand: BotHand) =>
        this.baseCurrencyIsEnoughToTrade(hand) && lastPrice > hand.sellAbove
    );

    sellingHands.forEach((hand: BotHand) => {
      this.sell(hand, lastPrice);
    });
  }

  processLastPriceLettingRunnersRun(lastPrice: number): undefined {
    if (!this.onLastPriceHasRunAtLeastOnce) {
      this.hands.forEach((hand: BotHand) => {
        if (
          this.quoteCurrencyIsEnoughToTrade(hand) &&
          lastPrice < hand.buyBelow
        ) {
          // console.log("first run buy by hand", hand.id, "at", lastPrice);
          this.buy(hand, lastPrice);
        }
      });

      // this.onLastPriceHasRunAtLeastOnce = true;

      return;
    }

    const stepPercent: number = 0.01; // todo: temp value

    this.hands
      .filter((hand: BotHand) => hand.readyToBuy)
      .forEach((hand: BotHand) => {
        if (!this.quoteCurrencyIsEnoughToTrade(hand)) {
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

    this.hands.forEach((hand: BotHand) => {
      if (!this.quoteCurrencyIsEnoughToTrade(hand)) {
        // hand has no quote - do nothing
      } else if (!hand.readyToBuy && lastPrice < hand.buyBelow) {
        // console.log("marking hand", hand.id, "ready to buy, at", lastPrice);
        hand.readyToBuy = true;
      }
    });

    this.hands
      .filter((hand: BotHand) => hand.readyToSell)
      .forEach((hand: BotHand) => {
        if (!this.baseCurrencyIsEnoughToTrade(hand)) {
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

    this.hands.forEach((hand: BotHand) => {
      if (!this.baseCurrencyIsEnoughToTrade(hand)) {
        // hand has no base - do nothing
      } else if (!hand.readyToSell && lastPrice > hand.sellAbove) {
        hand.readyToSell = true;
        // console.log("marking hand", hand.id, "ready to sell, at", lastPrice);
      }
    });
  }

  // todo: fix so the properties are not modified via a parameter
  buy(hand: BotHand, lastPrice: number) {
    const buyMethod: (
      hand: BotHand,
      lastPrice: number
    ) => void = store.isHistoricalPrice ? this.trader.buyFake : this.trader.buy;

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

    this.storeCurrentResultsAndConsoleLogThem(); // todo: re-evaluate
  }

  sell(hand: BotHand, lastPrice: number) {
    const sellMethod: (
      hand: BotHand,
      lastPrice: number
    ) => void = store.isHistoricalPrice
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

    this.storeCurrentResultsAndConsoleLogThem(); // todo: re-evaluate
  }

  storeCurrentResultsAndConsoleLogThem() {
    store.setResults(this.itsAccountId, this.id, this.getResults());
    console.log(this.getBotDataWithResults());
  }

  getQuoteTotalIncludingBaseSoldAsPlanned(): number {
    const arr: BotHand[] = JSON.parse(JSON.stringify(this.hands));

    arr.forEach((hand: BotHand) => {
      if (hand.base > 0) {
        hand.quote += hand.base * hand.sellAbove;
        hand.base = 0;
      }
    });

    return arr.reduce(
      (accumulator: number, item: BotHand) => accumulator + item.quote,
      0
    );
  }

  recordLowestAndHighestPrice(lastPrice: number) {
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
