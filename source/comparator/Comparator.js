import eventBus from "../events/eventBus.js";

export default class Comparator {
  static botConfigsWithResults = [];
  static botConfigs = [];
  static exchangeFee = 0.001;
  static from = 1000;
  static to = 100000;

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
    const handSpanMin = 0.006;
    const handSpanMax = 0.17;
    const handStep = 0.001;

    const arr = [];
    for (
      let handSpan = handSpanMin;
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
      });
    }

    return arr;
  }

  static sortConfigsByProfit() {
    return Comparator.botConfigsWithResults.sort(
      (previousItem, currentItem) =>
        previousItem.results.pairTotal -
        currentItem.results.pairTotal
      // previousItem.results.sellCountTotal - currentItem.results.sellCountTotal
      // previousItem.config.handCount - currentItem.config.handCount
    );
  }
}
