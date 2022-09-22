/*
 * gets last prices at real time and appends them to file
 */

import fs from "fs";
import PriceReader from "../price-reader/price-reader.js";

const commandLineArguments: string[] = process.argv;
const symbol: string = commandLineArguments[2];
const outputFilePath: string = commandLineArguments[3];

collect();

function collect() {
  if (!symbol) {
    console.error(
      "Please specify a currency symbol in the command line, for example: BTC-USDT"
    );

    return;
  }

  if (!outputFilePath) {
    console.error(
      "Please specify an output file path in the command line, for example: my-output-file.csv"
    );

    return;
  }

  console.log(`Collecting prices for symbol: ${symbol}`);
  console.log(`Writing to file: ${outputFilePath}`);

  PriceReader.startOneSymbolLivePriceStream(
    symbol,
    async (lastPrice: number) => {
      try {
        await fs.promises.appendFile(
          outputFilePath,
          `${lastPrice.toString()}\n`
        );

        console.log(lastPrice);
      } catch (e) {
        console.log(e);
      }
    }
  );
}
