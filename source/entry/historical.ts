import "dotenv/config";
import store from "../store/Store.js";
import Runner from "../runner/Runner.js";
import eventBus from "../events/eventBus.js";

const isHistoricalPrice: boolean = true;

begin();

async function begin() {
  await store.setUp({ isHistoricalPrice });

  eventBus.on(
    eventBus.events!.BOT_DONE_PROCESSING_HISTORICAL_PRICES,
    console.log
  );

  Runner.runBots();
  Runner.runPriceReader(isHistoricalPrice);
}
