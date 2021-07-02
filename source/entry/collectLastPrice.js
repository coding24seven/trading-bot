/*
 * gets last prices at real time and appends them to file
 */

import fs from "fs";
import Binance from "node-binance-api";

const binance = new Binance();
const outputFilePath =
  "historical-price-files/last-prices-collected-at-real-time.csv";

binance.websockets.miniTicker(async (pairs) => {
  const pair = pairs.BTCUSDT;

  if (!pair || !pair.close) return;

  const lastPrice = parseFloat(pair.close);

  if (isNaN(lastPrice)) {
    console.log(`${lastPrice} is not a number`);
    return;
  }

  try {
    await fs.promises.appendFile(
      outputFilePath,
      "0, 0, " + lastPrice.toString() + "\n"
    );

    console.log(lastPrice);
  } catch (e) {
    console.log(e);
  }
});
