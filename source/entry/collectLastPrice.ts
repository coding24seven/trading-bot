/*
 * gets last prices at real time and appends them to file
 */

import fs from "fs";
import PriceReader from "../price-reader/PriceReader.js";

const outputFilePath: string =
  "historical-price-files/last-prices-collected-at-real-time.csv";

PriceReader.startLiveStream(async (lastPrice: number) => {
  try {
    await fs.promises.appendFile(
      outputFilePath,
      `0, 0, ${lastPrice.toString()}\n`
    );

    console.log(lastPrice);
  } catch (e) {
    console.log(e);
  }
});
