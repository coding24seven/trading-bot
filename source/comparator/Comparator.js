import eventBus from "../events/eventBus.js";
import fs from "fs";
import { isBotValid } from "../utils/index.js";

export default class Comparator {
  static botConfigsWithResults = []; // bot configs with their corresponding results
  static botConfigs = [];
  static exchangeFee = 0.001;
  static from = 34990;
  static to = 36010;

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
    const handSpanMin = 100;
    const handSpanMax = 6000;
    const handStep = 100;
    const shrinkByPercentMin = 0;
    const shrinkByPercentMax = 50;
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
        /* 'handSpanAfterShrinkage' and 'handCount' used for validation only */
        const handSpanAfterShrinkage =
          handSpan - handSpan * (shrinkByPercent / 100);
        const handCount = Math.floor(
          (Comparator.to - Comparator.from) / handSpan
        );

        if (
          isBotValid({
            exchangeFee: Comparator.exchangeFee,
            to: Comparator.to,
            handCount,
            handSpan: handSpanAfterShrinkage,
          })
        ) {
          arr.push({
            pair,
            from: Comparator.from,
            to: Comparator.to,
            handCount: null,
            handSpan,
            shrinkByPercent,
            handSpanAfterShrinkage: null,
            quoteStartAmount: 100, // total usdt for the tradable area
            quoteStartAmountPerHand: null,
            exchangeFee: Comparator.exchangeFee,
          });
        }
      }
    }

    return arr;
  }

  static findMostProfitableConfigs(count) {
    const sortedResults = Comparator.botConfigsWithResults.sort(
      (previousItem, currentItem) =>
        previousItem.results.quoteTotalIncludingBaseSoldAsPlanned -
        currentItem.results.quoteTotalIncludingBaseSoldAsPlanned
    );

    fs.promises.writeFile(
      "logs/bots-sorted.json",
      JSON.stringify(sortedResults, null, 2)
    );

    return sortedResults.slice(-count);
  }
}
