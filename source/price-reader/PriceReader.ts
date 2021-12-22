/*
 * gets last prices at real time
 * (kucoin ticker fires at 100ms interval)
 */

import "dotenv/config";
import axios from "axios";
import eventBus from "../events/eventBus.js";
import CsvFileReader from "../file-reader/CsvFileReader.js";
import kucoin from "kucoin-node-api";
import { AccountConfig, KucoinNodeApiTickerMessage } from "../types";
import Messages from "../messages/index.js";

export default class PriceReader {
  static cachedFileContent: { [key: string]: number[][] } = {};
  static maxPossiblePrice: number = 1000000;
  static dateMs: number = Date.now();
  static callbackIntervalDefaultMs: number = 1000;
  static callbackIntervalMs: number = parseInt(
    process.env.LAST_PRICE_CALLBACK_INTERVAL_MS ||
      String(PriceReader.callbackIntervalDefaultMs)
  );
  static exchangeApiDefaultEnvironment: string = "sandbox";
  static exchangeApiEnvironment: string =
    process.env.EXCHANGE_API_ENVIRONMENT ||
    PriceReader.exchangeApiDefaultEnvironment;
  static config: AccountConfig = {
    apiKey: "",
    secretKey: "",
    passphrase: "",
    environment: PriceReader.exchangeApiEnvironment,
  };

  static startLastPriceTicker(callback: (lastPrice: number) => void) {
    kucoin.init(PriceReader.config);

    kucoin.initSocket(
      { topic: "ticker", symbols: ["BTC-USDT"] },
      async (messageAsString: string) => {
        const intervalNotFinished: boolean =
          Date.now() < PriceReader.dateMs + PriceReader.callbackIntervalMs;

        if (intervalNotFinished) return;

        PriceReader.dateMs = Date.now();

        const message: KucoinNodeApiTickerMessage = JSON.parse(messageAsString);

        if (!message.data?.price) return;

        const lastPrice: number = parseFloat(message.data.price);

        if (isNaN(lastPrice)) {
          console.log(`${lastPrice} ${Messages.IS_NOT_A_NUMBER}`);
          return;
        }

        callback(lastPrice);
      }
    );
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
          price > 0 && price <= PriceReader.maxPossiblePrice;

        if (priceWithinReasonableRange) {
          eventBus.emit(eventBus.events!.LAST_PRICE, price);
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
    const exchangeApiUrl = process.env.EXCHANGE_API_URL;
    const url = `${exchangeApiUrl}/${queryString}`;
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
