/*
 * gets last prices at real time and appends them to file
 */

import fs from "fs";
import PriceReader from "../price-reader/PriceReader.js";

const commandLineArguments: string[] = process.argv;
const symbol: string = commandLineArguments[2];

collect();

function collect() {
  if (!symbol) {
    console.error(
      "Please specify a currency symbol in the command line, for example: BTC-USDT"
    );

    return;
  }

  console.log(`Collecting prices for symbol: ${symbol}`);

  const outputFilePath: string =
    "historical-price-files/last-prices-collected-at-real-time.csv";

  PriceReader.startOneSymbolLivePriceStream(
    symbol,
    async (lastPrice: number) => {
      try {
        await fs.promises.appendFile(
          outputFilePath,
          `0, 0, ${lastPrice.toString()}\n`
        );

        console.log(lastPrice);
      } catch (e) {
        console.log(e);
      }
    }
  );
}
