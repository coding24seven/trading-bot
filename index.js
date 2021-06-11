import "dotenv/config";
import store from "./source/store/Store.js";
import Runner from "./source/runner/Runner.js";

const commandLineArguments = process.argv;
const isHistoricalPrice = commandLineArguments.includes("historical");
const consoleLogAccountsAndQuit = commandLineArguments.includes(
  "console.log:accounts"
);

begin();

async function begin() {
  await store.setUp(isHistoricalPrice);

  if (consoleLogAccountsAndQuit) {
    console.log(store.accountsAsString);
  } else {
    Runner.runBots();
    Runner.runPriceReader(isHistoricalPrice);
  }
}
