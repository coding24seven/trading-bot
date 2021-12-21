/*
 * gets last prices at real time and appends them to file
 */

import fs from "fs";
import Binance from "node-binance-api";
import { Pair, Pairs } from "../types";
import Messages from "../messages/index.js";

const binance: Binance = new Binance();
const outputFilePath: string =
  "historical-price-files/last-prices-collected-at-real-time.csv";

binance.websockets.miniTicker(async (pairs: Pairs) => {
  const pair: Pair = pairs.BTCUSDT;

  if (!pair?.close) return;

  const lastPrice: number = pair.close;

  if (isNaN(lastPrice)) {
    console.log(`${lastPrice} ${Messages.IS_NOT_A_NUMBER}`);
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
