import axios from "axios";
import eventBus from "../events/eventBus.js";
import CsvFileReader from "../file-reader/CsvFileReader.js";
import Binance from "node-binance-api";
import { Pairs } from "../types";

export default class PriceReader {
  static cachedFileContent: { [key: string]: number[][] } = {};
  static binance: Binance = new Binance();

  static startLastPriceMiniTicker() {
    PriceReader.binance.websockets.miniTicker((pairs: Pairs) => {
      eventBus.emit(eventBus.events!.LAST_PRICE, pairs);
    });
  }

  static startHistoricalPriceStream(filePaths: string[], column: number) {
    filePaths.forEach((filePath: string) => {
      const rowsPopulatedWithNumbers: number[][] =
        this.cachedFileContent[filePath] ||
        CsvFileReader.getRowsPopulatedWithNumbers(filePath);

      this.cachedFileContent[filePath] = rowsPopulatedWithNumbers;

      rowsPopulatedWithNumbers.forEach((row: number[]) => {
        const price: number = row[column];
        const priceWithinReasonableRange: boolean =
          price > 0 && price < 2000000;

        if (priceWithinReasonableRange) {
          const pairs: Pairs = {
            BTCUSDT: { close: price },
          };
          eventBus.emit(eventBus.events!.LAST_PRICE, pairs);
        }
      });
    });

    eventBus.emit(eventBus.events!.HISTORICAL_PRICE_READER_FINISHED);
  }

  /* unused atm - use if websockets fail */
  static startLastPriceHttpStream(pair, interval) {
    setInterval(async () => {
      let lastPrice = (await PriceReader.getLastPrice(pair)).data.price;
      lastPrice = parseFloat(lastPrice);
      eventBus.emit(eventBus.events!.LAST_PRICE, lastPrice);
    }, interval);
  }

  /* unused atm - use if websockets fail */
  static async getLastPrice(pair) {
    let queryString = `ticker/price?symbol=${pair}`;
    const binanceApiUrl = process.env.BINANCE_API_URL;
    const url = `${binanceApiUrl}/${queryString}`;
    console.log("url", url);
    const config = {
      method: "get",
      url,
      headers: {
        "Content-Type": "application/json",
      },
    };

    // @ts-ignore
    return axios(config);
  }
}
