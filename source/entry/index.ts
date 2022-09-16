import "dotenv/config";
import Runner from "../runner/Runner.js";
import store from "../store/Store.js";

const commandLineArguments: string[] = process.argv;

const continueWithExistingDatabase: boolean = !commandLineArguments.includes(
  "starts:with:new:store"
);

begin();

async function begin() {
  try {
    await store.setUp({ continueWithExistingDatabase });
    Runner.runBots();
    Runner.runPriceReader();
  } catch (e) {
    console.log(e);
  }
}
