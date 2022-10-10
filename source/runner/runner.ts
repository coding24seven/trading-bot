import Account from '../account/account.js'
import eventBus from '../events/event-bus.js'
import PriceReader from '../price-reader/price-reader.js'
import store from '../store/store.js'
import { AccountData, PriceStreamCallbackParameters } from '../types'

export default class Runner {
  static runBots() {
    store.accounts.forEach((accountData: AccountData) => {
      new Account(accountData)
    })
  }

  static runPriceReader(filePaths?: string[], priceColumnIndex: number = 0) {
    if (filePaths && filePaths.length > 0) {
      PriceReader.startHistoricalStream(filePaths, priceColumnIndex)
    } else {
      PriceReader.startAllSymbolsLivePriceStream(
        ({ symbol, lastPrice }: PriceStreamCallbackParameters) => {
          eventBus.emit(eventBus.events!.LAST_PRICE, { symbol, lastPrice })
        }
      )
    }
  }
}
