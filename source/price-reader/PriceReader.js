import axios from "axios";
import eventBus from "../events/eventBus.js";
import CsvFileReader from "../file-reader/CsvFileReader.js";
import Binance from "node-binance-api";

export default class PriceReader {
  static cachedFileContent = {};
  static binance = new Binance();

  static startLastPriceMiniTicker() {
    PriceReader.binance.websockets.miniTicker((pairs) => {
      eventBus.emit(eventBus.events.LAST_PRICE, pairs);
    });
  }

  static startHistoricalPriceStream(filePaths, column) {
    filePaths.forEach((filePath) => {
      const rowsPopulatedWithNumbers =
        this.cachedFileContent[filePath] ||
        CsvFileReader.getRowsPopulatedWithNumbers(filePath);

      this.cachedFileContent[filePath] = rowsPopulatedWithNumbers;

      rowsPopulatedWithNumbers.forEach((row) => {
        const price = row[column];
        const priceWithinReasonableRange = price > 0 && price < 2000000;

        if (priceWithinReasonableRange) {
          const pairs = {
            BTCUSDT: { close: price },
          };
          eventBus.emit(eventBus.events.LAST_PRICE, pairs);
        }
      });
    });

    eventBus.emit(eventBus.events.HISTORICAL_PRICE_READER_FINISHED);
  }

  /* unused atm - use if websockets fail */
  static startLastPriceHttpStream(pair, interval) {
    setInterval(async () => {
      let lastPrice = (await PriceReader.getLastPrice(pair)).data.price;
      lastPrice = parseFloat(lastPrice);
      eventBus.emit(eventBus.events.LAST_PRICE, lastPrice);
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

    return axios(config);
  }
}
