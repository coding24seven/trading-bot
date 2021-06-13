import "dotenv/config";
import store from "./source/store/Store.js";
import Runner from "./source/runner/Runner.js";

const commandLineArguments = process.argv;
const isHistoricalPrice = commandLineArguments.includes("historical");
const consoleLogAccountsAndQuit = commandLineArguments.includes(
  "console.log:accounts"
);

/* creates new store, overwriting existing database */
const shouldCreateNewStore = commandLineArguments.includes("new:store");

begin();

async function begin() {
  await store.setUp({ newStore: shouldCreateNewStore, isHistoricalPrice });

  if (consoleLogAccountsAndQuit) {
    console.log(store.accountsAsString);
  } else {
    Runner.runBots();
    Runner.runPriceReader(isHistoricalPrice);
  }
}
