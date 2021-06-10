import "dotenv/config";
import store from "./source/store/Store.js";
import Comparator from "./source/comparator/Comparator.js";
import eventBus from "./source/events/eventBus.js";
import Runner from "./source/runner/Runner.js";

Comparator.run();

console.log("bot config count:", Comparator.botConfigs.length);

Comparator.botConfigs.forEach((botConfig, i) => {
  Comparator.addEventListeners();
  store.setUp(true, botConfig);

  Runner.runBots();
  Runner.runPriceReader(true);

  eventBus.removeAllListeners();

  if (i % 10 === 0) {
    console.log("count", i);
  }
});

console.log("******************");
console.log(Comparator.findMostProfitableConfig());
