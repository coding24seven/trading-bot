import "dotenv/config";
import store from "./source/store/Store.js";
import Runner from "./source/runner/Runner.js";

const commandLineArguments = process.argv;
const historicalPrice = commandLineArguments.includes("historical");

store.setUp(historicalPrice);

if (commandLineArguments.includes("console.log:accounts")) {
  console.log(store.accountsAsString);
} else {
  Runner.runBots();
  Runner.runPriceReader(historicalPrice);
}
