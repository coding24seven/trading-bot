import eventBus from "../events/eventBus.js";
import fs from "fs";

export default class Comparator {
  static botConfigsWithResults = []; // bot configs with their corresponding results
  static botConfigs = [];

  static run(pair) {
    Comparator.botConfigs = Comparator.generateBotConfigs(pair);
    // console.log("bot config count*****", Comparator.botConfigs.length);
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
    const bracketSpanMin = 100;
    const bracketSpanMax = 6000;
    const bracketStep = 100;
    const shrinkByPercentMin = 0;
    const shrinkByPercentMax = 50;
    const shrinkByPercentStep = 5;

    const arr = [];
    for (
      let bracketSpan = bracketSpanMin;
      bracketSpan <= bracketSpanMax;
      bracketSpan += bracketStep
    ) {
      for (
        let shrinkByPercent = shrinkByPercentMin;
        shrinkByPercent <= shrinkByPercentMax;
        shrinkByPercent += shrinkByPercentStep
      ) {
        arr.push({
          from: 50000,
          to: 60000,
          bracketSpan,
          shrinkByPercent,
          quoteStartAmount: 100, // total usdt for the tradable area
          exchangeFee: 0.001,
          pair,
        });
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
