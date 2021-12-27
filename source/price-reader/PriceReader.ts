/*
 * gets last prices at real time
 * (kucoin ticker fires at 100ms interval)
 */

import "dotenv/config";
import eventBus from "../events/eventBus.js";
import CsvFileReader from "../file-reader/CsvFileReader.js";
import { KucoinNodeApiTickerMessage } from "../types";
import Messages from "../types/messages.js";
import { Exchange } from "../exchange/Exchange.js";

export default class PriceReader {
  static cachedFileContent: { [key: string]: number[][] } = {};
  static maxPossiblePrice: number = 2000000;
  static dateMs: number = Date.now();
  static callbackIntervalDefaultMs: number = 1000;
  static callbackIntervalMs: number = parseInt(
    process.env.LAST_PRICE_CALLBACK_INTERVAL_MS ||
      String(PriceReader.callbackIntervalDefaultMs)
  );

  static startLiveStream(callback: (lastPrice: number) => void) {
    Exchange.startWSTicker(
      process.env.SYMBOL_GLOBAL,
      (messageAsString: string) => {
        const intervalNotCompleted: boolean =
          Date.now() < PriceReader.dateMs + PriceReader.callbackIntervalMs;

        if (intervalNotCompleted) return;

        PriceReader.dateMs = Date.now();

        const message: KucoinNodeApiTickerMessage = JSON.parse(messageAsString);

        if (!message.data?.price) return;

        const lastPrice: number = parseFloat(message.data.price);

        if (PriceReader.priceIsValid(lastPrice)) {
          callback(lastPrice);
        }
      }
    );
  }

  static startHistoricalStream(filePaths: string[], column: number) {
    filePaths.forEach((filePath: string) => {
      const rowsPopulatedWithNumbers: number[][] =
        this.cachedFileContent[filePath] ||
        CsvFileReader.getRowsPopulatedWithNumbers(filePath);

      this.cachedFileContent[filePath] = rowsPopulatedWithNumbers;

      rowsPopulatedWithNumbers.forEach((row: number[]) => {
        const price: number = row[column];

        if (PriceReader.priceIsValid(price)) {
          eventBus.emit(eventBus.events!.LAST_PRICE, price);
        }
      });
    });

    eventBus.emit(eventBus.events!.HISTORICAL_PRICE_READER_FINISHED);
  }

  private static priceIsValid(price: number): boolean {
    if (isNaN(price)) {
      console.log(`${price} ${Messages.IS_NOT_A_NUMBER}`);
      return false;
    }

    const priceOutsideBounds: boolean =
      price <= 0 || price > PriceReader.maxPossiblePrice;

    return !priceOutsideBounds;
  }
}
