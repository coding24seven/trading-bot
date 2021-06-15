import "dotenv/config";
import store from "./source/store/Store.js";
import Runner from "./source/runner/Runner.js";
import eventBus from "./source/events/eventBus.js";

const isHistoricalPrice = true;

begin();

async function begin() {
  await store.setUp({ isHistoricalPrice });

  eventBus.on(eventBus.events.BOT_DONE_PROCESSING_HISTORICAL_PRICES, console.log);

  Runner.runBots();
  Runner.runPriceReader(isHistoricalPrice);
}
