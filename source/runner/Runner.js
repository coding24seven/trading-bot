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
      const columnWithPrice = 3;
      // const fileName = "BTCUSDT-1m-2021-05.csv";
      const fileName = "BTCUSDT-1m-2021-04.csv";
      // const fileName = "BTCUSDT-1m-2021-06-06.csv";
      // const fileName = "small.csv";
      PriceReader.startHistoricalPriceOfflineStream(fileName, columnWithPrice);
    } else {
      PriceReader.startLastPriceMiniTicker();
      // PriceReader.startLastPriceHttpStream(
      //   "BTCUSDT",
      //   process.env.LAST_PRICE_HTTP_REQUEST_INTERVAL_MS
      // );
    }
  }
}
