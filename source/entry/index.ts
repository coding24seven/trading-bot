import "dotenv/config";
import store from "../store/Store.js";
import Runner from "../runner/Runner.js";

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
