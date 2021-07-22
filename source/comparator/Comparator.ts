import eventBus from "../events/eventBus.js";
import { BotConfig, BotDataWithResults, BotVariables } from "../types";

export default class Comparator {
  static botConfigsWithResults: BotDataWithResults[] = [];
  static botConfigs: BotConfig[] = [];
  static exchangeFee: number = 0.001;
  static from: number = 1000;
  static to: number = 100000;

  static run(pair: string) {
    Comparator.botConfigs = Comparator.generateBotConfigs(pair);
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

  static generateBotConfigs(pair: string): BotConfig[] {
    const handSpanMin: number = 0.006;
    const handSpanMax: number = 0.17;
    const handStep: number = 0.01;
    const arr: BotConfig[] = [];

    for (
      let handSpan: number = handSpanMin;
      handSpan <= handSpanMax;
      handSpan += handStep
    ) {
      arr.push({
        pair,
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
