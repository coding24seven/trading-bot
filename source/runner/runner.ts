import Account from "../account/account.js";
import eventBus from "../events/event-bus.js";
import PriceReader from "../price-reader/price-reader.js";
import store from "../store/store.js";
import { AccountData, PriceStreamCallbackParameters } from "../types";

export default class Runner {
  static runBots() {
    store.accounts.forEach((accountData: AccountData) => {
      new Account(accountData);
    });
  }

  static runPriceReader(
    isHistoricalPrice: boolean = false,
    filePath?: string,
    priceColumnIndex: number = 0
  ) {
    if (isHistoricalPrice && filePath) {
      const directory: string = "historical-price-files";

      const monthNumbers: number[] = [6];
      // const fileNames = monthNumbers.map(
      //   (number) => `${directory}/BTCUSDT-1m-2021-0${number}.csv`
      // );

      const fileNames: string[] = [filePath];

      PriceReader.startHistoricalStream(fileNames, priceColumnIndex);
    } else {
      PriceReader.startAllSymbolsLivePriceStream(
        ({ symbol, lastPrice }: PriceStreamCallbackParameters) => {
          eventBus.emit(eventBus.events!.LAST_PRICE, { symbol, lastPrice });
        }
      );
    }
  }
}
