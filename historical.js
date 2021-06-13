import "dotenv/config";
import store from "./source/store/Store.js";
import Runner from "./source/runner/Runner.js";
import eventBus from "./source/events/eventBus.js";

begin();

async function begin() {
  await store.setUp({ isHistoricalPrice: true });

  eventBus.on(eventBus.events.BOT_FINISHED, console.log);

  Runner.runBots();
  Runner.runPriceReader(true);
}
