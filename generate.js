import "dotenv/config";
import store from "./source/store/Store.js";
import Comparator from "./source/comparator/Comparator.js";
import eventBus from "./source/events/eventBus.js";
import Runner from "./source/runner/Runner.js";

const isHistoricalPrice = true;

Comparator.run("BTCUSDT");

console.log("bot count:", Comparator.botConfigs.length);

Comparator.botConfigs.forEach((botConfig, i) => {
  Comparator.addEventListeners();

  store.setUp({ isHistoricalPrice, botConfigFromGenerator: botConfig });

  Runner.runBots();
  Runner.runPriceReader(isHistoricalPrice);

  eventBus.removeAllListeners();

  // if (i % 100 === 0) {
  console.log("count", i + 1);
  // }
});

console.log(Comparator.findMostProfitableConfigs(6));
