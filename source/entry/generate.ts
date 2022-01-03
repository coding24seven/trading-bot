import "dotenv/config";
import store from "../store/Store.js";
import Comparator from "../comparator/Comparator.js";
import eventBus from "../events/eventBus.js";
import Runner from "../runner/Runner.js";
import fs from "fs";
import { BotConfig, BotDataWithResults } from "../types";

const commandLineArguments: string[] = process.argv;
const filePath: string = commandLineArguments[2];
const priceColumnIndexAsString: string = commandLineArguments[3];
const priceColumnIndex: number = parseInt(priceColumnIndexAsString);
const isHistoricalPrice: boolean = true;

if (filePath && priceColumnIndex) {
  begin();
}

async function begin() {
  Comparator.run("BTC-USDT");

  console.log("bot count:", Comparator.botConfigs.length);

  Comparator.botConfigs.forEach((botConfig: BotConfig, i: number) => {
    Comparator.addEventListeners();

    store.setUp({ isHistoricalPrice, botConfigFromGenerator: botConfig });

    Runner.runBots();
    Runner.runPriceReader(isHistoricalPrice, filePath, priceColumnIndex);

    eventBus.removeAllListeners();

    console.log("count", i + 1);
  });

  const sortedResults: BotDataWithResults[] = Comparator.sortConfigsByProfit();

  fs.promises.writeFile(
    "logs/bots-sorted.json",
    JSON.stringify(sortedResults, null, 2)
  );

  const mostProfitableConfigsToShowCount: number = 6;

  console.log(
    JSON.stringify(
      sortedResults.slice(-mostProfitableConfigsToShowCount),
      null,
      2
    )
  );
}
