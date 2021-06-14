import "dotenv/config";
import store from "./source/store/Store.js";
import Runner from "./source/runner/Runner.js";

const commandLineArguments = process.argv;

const continueWithExistingDatabase = !commandLineArguments.includes("starts:with:new:store");

begin();

async function begin() {
  await store.setUp({ continueWithExistingDatabase });

  Runner.runBots();
  Runner.runPriceReader();
}
