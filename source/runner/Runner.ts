import store from "../store/Store.js";
import Account from "../account/Account.js";
import PriceReader from "../price-reader/PriceReader.js";
import { AccountData } from "../types";
import eventBus from "../events/eventBus.js";

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
      const fileNames = monthNumbers.map(
        (number) => `${directory}/BTCUSDT-1m-2021-0${number}.csv`
      );

      // const fileNames = [`${directory}/small.csv`];
      // const fileNames: string[] = [
      //   `${directory}/last-prices-collected-over-two-weeks.csv`,
      // ];

      PriceReader.startHistoricalStream(fileNames, columnWithPrice);
    } else {
      PriceReader.startLiveStream((lastPrice: number) => {
        eventBus.emit(eventBus.events!.LAST_PRICE, lastPrice);
      });
    }
  }
}
