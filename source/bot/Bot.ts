import "dotenv/config";
import eventBus from "../events/eventBus.js";
import store from "../store/Store.js";
import Trader from "../trader/Trader.js";
import {
  BotConfig,
  BotData,
  BotDataWithResults,
  BotHand,
  BotResults,
  KucoinSymbolData,
  PriceStreamCallbackParameters,
  TradeHistoryItem,
} from "../types";
import { Exchange } from "../exchange/Exchange.js";
import Messages from "../types/messages.js";
import { getValueWithValidDecimalPlaces } from "../utils/index.js";

export default class Bot {
  data: BotData;
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
  count: number = 0;
  onLastPriceHasRunAtLeastOnce: boolean = false;
  tradeHistory: TradeHistoryItem[] = []; // not added to store atm
  dateMs: number = Date.now();
  processLastPriceIntervalDefaultMs: number = 1000;
  processLastPriceIntervalMs: number = parseInt(
    process.env.LAST_PRICE_CALLBACK_INTERVAL_MS ||
      String(this.processLastPriceIntervalDefaultMs)
  );

  constructor(data: BotData) {
    this.data = data;
    this.id = data.config.id;
    this.itsAccountId = data.config.itsAccountId;
    this.hands = data.vars.hands;
    this.symbol = data.config.symbol;
    this.trader = new Trader(
      data.config.itsAccountId!,
      data.config.symbol,
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

  async onLastPrice({ symbol, lastPrice }: PriceStreamCallbackParameters) {
    if (!store.isHistoricalPrice) {
      const intervalNotCompleted: boolean =
        Date.now() < this.dateMs + this.processLastPriceIntervalMs;

      if (intervalNotCompleted || this.symbol !== symbol) return;

      console.log(lastPrice, symbol);
      this.dateMs = Date.now();
    }

    this.lastPrice = lastPrice;
    this.recordLowestAndHighestPrice(lastPrice);

    if (!this.onLastPriceHasRunAtLeastOnce) {
      if (store.isHistoricalPrice) {
        // todo: replace the hardcoded 'BTC-USDT' values for historical price with exchange api values
        this.data.config.baseMinimumTradeSize = 0.00001;
        this.data.config.quoteMinimumTradeSize = 0.01;
        this.data.config.baseIncrement = 0.00000001;
        this.data.config.quoteIncrement = 0.000001;
      } else {
        await this.setValidTradeParameters();
      }
    }

    this.processLastPrice(lastPrice);

    this.onLastPriceHasRunAtLeastOnce = true;
  }

  processLastPrice(lastPrice: number) {
    const buyingHands: BotHand[] = this.hands.filter(
      (hand: BotHand) =>
        !hand.tradeIsPending &&
        this.isQuoteCurrencyEnoughToTrade(hand.quote) &&
        lastPrice < hand.buyBelow
    );

    buyingHands.forEach(async (hand: BotHand) => {
      const quoteToSpend: number = this.makeQuoteValidForTrade(hand.quote);
      let baseReceived: number | null;

      if (store.isHistoricalPrice) {
        baseReceived = this.trader.tradeFake(true, quoteToSpend, lastPrice);
      } else {
        hand.tradeIsPending = true;
        baseReceived = await this.trader.trade(true, quoteToSpend);
      }

      if (!baseReceived) return;

      hand.quote -= quoteToSpend;
      hand.base += baseReceived;
      hand.buyCount++;
      hand.tradeIsPending = false;
      this.buyCountTotal++;
      this.updateAfterTrade(hand, lastPrice, "buy");
    });

    const sellingHands: BotHand[] = this.hands.filter(
      (hand: BotHand) =>
        !hand.tradeIsPending &&
        this.isBaseCurrencyEnoughToTrade(hand.base) &&
        lastPrice > hand.sellAbove
    );

    sellingHands.forEach(async (hand: BotHand) => {
      const baseToSpend: number = this.makeBaseValidForTrade(hand.base);
      let quoteReceived: number | null;

      if (store.isHistoricalPrice) {
        quoteReceived = this.trader.tradeFake(false, baseToSpend, lastPrice);
      } else {
        hand.tradeIsPending = true;
        quoteReceived = await this.trader.trade(false, baseToSpend);
      }

      if (!quoteReceived) return;

      hand.base -= baseToSpend;
      hand.quote += quoteReceived;
      hand.sellCount++;
      hand.tradeIsPending = false;
      this.sellCountTotal++;
      this.updateAfterTrade(hand, lastPrice, "sell");
    });
  }

  isBaseCurrencyEnoughToTrade(base: number): boolean {
    if (!this.data.config.baseMinimumTradeSize) {
      throw new Error(Messages.MINIMUM_ALLOWED_TRADE_SIZES_NOT_SET);
    }

    return base >= this.data.config.baseMinimumTradeSize;
  }

  isQuoteCurrencyEnoughToTrade(quote: number): boolean {
    if (!this.data.config.quoteMinimumTradeSize) {
      throw new Error(Messages.MINIMUM_ALLOWED_TRADE_SIZES_NOT_SET);
    }

    return quote >= this.data.config.quoteMinimumTradeSize;
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
      lastPrice: this.lastPrice,
      lowestPriceRecorded: this.lowestPriceRecorded,
      highestPriceRecorded: this.highestPriceRecorded,
    };
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

  getTradeHistoryItem(
    hand: BotHand,
    lastPrice: number,
    type: string
  ): TradeHistoryItem {
    return {
      id: hand.id,
      buyBelow: hand.buyBelow,
      sellAbove: hand.sellAbove,
      buyCount: hand.buyCount,
      sellCount: hand.sellCount,
      lastPrice,
      type,
    };
  }

  async setValidTradeParameters() {
    const symbolData:
      | KucoinSymbolData
      | undefined = await Exchange.getSymbolData(this.symbol);

    if (!symbolData) {
      throw new Error(Messages.EXCHANGE_SYMBOL_DATA_RESPONSE_FAILED);
    }

    this.data.config.baseMinimumTradeSize = parseFloat(symbolData.baseMinSize);
    this.data.config.quoteMinimumTradeSize = parseFloat(
      symbolData.quoteMinSize
    );
    this.data.config.baseIncrement = parseFloat(symbolData.baseIncrement);
    this.data.config.quoteIncrement = parseFloat(symbolData.quoteIncrement);
  }

  makeBaseValidForTrade(base: number): number {
    const { baseIncrement }: BotConfig = this.data.config;

    if (!baseIncrement) {
      throw new Error(Messages.TRADE_SIZE_INCREMENT_NOT_SET);
    }

    return getValueWithValidDecimalPlaces(base, baseIncrement);
  }

  makeQuoteValidForTrade(quote: number): number {
    const { quoteIncrement }: BotConfig = this.data.config;

    if (!quoteIncrement) {
      throw new Error(Messages.TRADE_SIZE_INCREMENT_NOT_SET);
    }

    return getValueWithValidDecimalPlaces(quote, quoteIncrement);
  }

  updateAfterTrade(hand: BotHand, lastPrice: number, type: string) {
    const tradeHistoryItem: TradeHistoryItem = this.getTradeHistoryItem(
      hand,
      lastPrice,
      type
    );
    this.tradeHistory.push(tradeHistoryItem);

    if (store.isHistoricalPrice) return;

    console.log(tradeHistoryItem);
    this.storeCurrentResults();
  }

  storeCurrentResults() {
    store.setResults(this.itsAccountId, this.id, this.getResults());
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
