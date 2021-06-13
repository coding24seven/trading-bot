import "dotenv/config";
import store from "./source/store/Store.js";
import Runner from "./source/runner/Runner.js";

const commandLineArguments = process.argv;

/* creates new store, overwriting existing database */
const shouldCreateNewStore = commandLineArguments.includes("new:store");

begin();

async function begin() {
  await store.setUp({ newStore: shouldCreateNewStore });

  Runner.runBots();
  Runner.runPriceReader();
}
