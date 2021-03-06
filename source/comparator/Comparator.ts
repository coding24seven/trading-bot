import eventBus from "../events/eventBus.js";
import { BotConfig, BotDataWithResults, BotVariables } from "../types";

export default class Comparator {
  static botConfigsWithResults: BotDataWithResults[] = [];
  static botConfigs: BotConfig[] = [];
  static exchangeFee: number = 0.001;
  static from: number = 20000;
  static to: number = 100000;

  static run(symbol: string) {
    Comparator.botConfigs = Comparator.generateBotConfigs(symbol);
  }

  static addEventListeners() {
    eventBus.on(
      eventBus.events!.BOT_DONE_PROCESSING_HISTORICAL_PRICES,
      Comparator.addBotDataWithResult
    );
  }

  static addBotDataWithResult(data: BotDataWithResults) {
    Comparator.botConfigsWithResults.push(data);
  }

  static generateBotConfigs(symbol: string): BotConfig[] {
    const handSpanMin: number = 0.006;
    const handSpanStep: number = 0.01;
    const handSpanMax: number = 0.17;
    const arr: BotConfig[] = [];

    for (
      let handSpan: number = handSpanMin;
      handSpan <= handSpanMax;
      handSpan += handSpanStep
    ) {
      arr.push({
        symbol,
        from: Comparator.from,
        to: Comparator.to,
        quoteFrom: 30000,
        quoteTo: 40000,
        baseFrom: 30000,
        baseTo: 40000,
        handCount: null,
        handSpan,
        quoteStartAmount: 100,
        quoteStartAmountPerHand: null,
        baseStartAmount: 0,
        baseStartAmountPerHand: null,
        exchangeFee: Comparator.exchangeFee,
        baseMinimumTradeSize: null,
        quoteMinimumTradeSize: null,
        baseIncrement: null,
        quoteIncrement: null,
        id: null,
        itsAccountId: null,
      });
    }

    return arr;
  }

  static sortConfigsByProfit(): BotDataWithResults[] {
    return Comparator.botConfigsWithResults.sort(
      (previousItem: BotVariables, currentItem: BotVariables) =>
        previousItem.results!.quoteTotalIncludingBaseSoldAsPlanned -
        currentItem.results!.quoteTotalIncludingBaseSoldAsPlanned
      // previousItem.results.sellCountTotal - currentItem.results.sellCountTotal
      // previousItem.config.handCount - currentItem.config.handCount
    );
  }
}
