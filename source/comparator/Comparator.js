import botConfig from "../bot/botConfig.js";
import eventBus from "../events/eventBus.js";

const selectedBotConfig = botConfig[4];

export default class Comparator {
  static botConfigsWithResults = []; // bot configs with their corresponding results
  static botConfigs = [];

  static run(pair) {
    Comparator.botConfigs = Comparator.generateBotConfigs(pair);
    // console.log("bot config count*****", Comparator.botConfigs.length);
  }

  static addEventListeners() {
    eventBus.on(
      eventBus.events.BOT_FINISHED,
      Comparator.addBotConfigWithResult
    );
  }

  static addBotConfigWithResult(data) {
    Comparator.botConfigsWithResults.push(data);
  }

  static generateBotConfigs(pair) {
    const bracketSpanMin = 20;
    const bracketSpanMax = 1000;
    const orderPlacementZoneMin = 10;
    const orderPlacementZoneMax = 100;

    const arr = [];
    for (
      let bracketSpan = bracketSpanMin;
      bracketSpan <= bracketSpanMax;
      bracketSpan += 1
    ) {
      for (
        let orderPlacementZone = orderPlacementZoneMin;
        orderPlacementZone <= orderPlacementZoneMax;
        orderPlacementZone += 1
      ) {
        if (true) {
          arr.push({
            from: 30000,
            to: 40000,
            bracketSpan,
            orderPlacementZone, // the subrange where you buy/sell
            quoteStartAmount: 100, // total usdt for the tradable area
            exchangeFee: 0.001,
            pair,
          });
        }
      }
    }

    return arr;
  }

  static findMostProfitableConfig() {
    return Comparator.botConfigsWithResults.reduce(
      (previousItem, currentItem) =>
        previousItem.results.pairTotal > currentItem.results.pairTotal
          ? previousItem
          : currentItem
    );
  }
}
