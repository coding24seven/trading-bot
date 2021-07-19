import store from "../store/Store.js";
import Account from "../account/Account.js";
import PriceReader from "../price-reader/PriceReader.js";

export default class Runner {
  static runBots() {
    store.accounts.forEach((accountData) => {
      new Account(accountData);
    });
  }

  static runPriceReader(isHistoricalPrice = false) {
    if (isHistoricalPrice) {
      const directory = "historical-price-files";
      const columnWithPrice = 2;

      const monthNumbers = [6];
      // const fileNames = monthNumbers.map(
      //   (number) => `${directory}/BTCUSDT-1m-2021-0${number}.csv`
      // );

      // const fileNames = [`${directory}/small.csv`];
      const fileNames = [`${directory}/last-prices-collected-at-real-time-copy.csv`];

      PriceReader.startHistoricalPriceStream(fileNames, columnWithPrice);
    } else {
      PriceReader.startLastPriceMiniTicker();
      // PriceReader.startLastPriceHttpStream(
      //   "BTCUSDT",
      //   process.env.LAST_PRICE_HTTP_REQUEST_INTERVAL_MS
      // );
    }
  }
}
