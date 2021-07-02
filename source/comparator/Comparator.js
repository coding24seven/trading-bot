import eventBus from "../events/eventBus.js";

export default class Comparator {
  static botConfigsWithResults = [];
  static botConfigs = [];
  static exchangeFee = 0.001;
  static from = 30000;
  static to = 40000;

  static run(pair) {
    Comparator.botConfigs = Comparator.generateBotConfigs(pair);
  }

  static addEventListeners() {
    eventBus.on(
      eventBus.events.BOT_DONE_PROCESSING_HISTORICAL_PRICES,
      Comparator.addBotConfigWithResult
    );
  }

  static addBotConfigWithResult(data) {
    Comparator.botConfigsWithResults.push(data);
  }

  static generateBotConfigs(pair) {
    const handSpanMin = 0.003;
    const handSpanMax = 0.15;
    const handStep = 0.001;
    const shrinkByPercentMin = 0;
    const shrinkByPercentMax = 0;
    const shrinkByPercentStep = 5;

    const arr = [];
    for (
      let handSpan = handSpanMin;
      handSpan <= handSpanMax;
      handSpan += handStep
    ) {
      for (
        let shrinkByPercent = shrinkByPercentMin;
        shrinkByPercent <= shrinkByPercentMax;
        shrinkByPercent += shrinkByPercentStep
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
          shrinkByPercent,
          handSpanAfterShrinkage: null,
          quoteStartAmount: 100,
          quoteStartAmountPerHand: null,
          baseStartAmount: 0,
          baseStartAmountPerHand: null,
          exchangeFee: Comparator.exchangeFee,
        });
      }
    }

    return arr;
  }

  static sortConfigsByProfit() {
    return Comparator.botConfigsWithResults.sort(
      (previousItem, currentItem) =>
        previousItem.results.pairTotal - currentItem.results.pairTotal
        // previousItem.results.sellCountTotal - currentItem.results.sellCountTotal
        // previousItem.config.handCount - currentItem.config.handCount
    );
  }
}
