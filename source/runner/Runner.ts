import store from "../store/Store.js";
import Account from "../account/Account.js";
import PriceReader from "../price-reader/PriceReader.js";
import { AccountData } from "../types";
import eventBus from "../events/eventBus";

export default class Runner {
  static runBots() {
    store.accounts.forEach((accountData: AccountData) => {
      new Account(accountData);
    });
  }

  static runPriceReader(isHistoricalPrice: boolean = false) {
    if (isHistoricalPrice) {
      const directory: string = "historical-price-files";
      const columnWithPrice: number = 2;

      const monthNumbers: number[] = [6];
      // const fileNames = monthNumbers.map(
      //   (number) => `${directory}/BTCUSDT-1m-2021-0${number}.csv`
      // );

      // const fileNames = [`${directory}/small.csv`];
      const fileNames: string[] = [
        `${directory}/last-prices-collected-at-real-time.csv`,
      ];

      PriceReader.startHistoricalPriceStream(fileNames, columnWithPrice);
    } else {
      PriceReader.startLastPriceTicker((lastPrice: number) => {
        eventBus.emit(eventBus.events!.LAST_PRICE, lastPrice);
      });
      // PriceReader.startLastPriceHttpStream(
      //   "BTCUSDT",
      //   process.env.LAST_PRICE_CALLBACK_INTERVAL_MS
      // );
    }
  }
}
