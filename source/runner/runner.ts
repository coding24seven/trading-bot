import Account from '../account/account.js'
import eventBus, { EventBusEvents } from '../events/event-bus.js'
import PriceReader from '../price-reader/price-reader.js'
import store from '../store/store.js'
import { AccountData, KucoinApiTickerMessage } from '../types'

function callbackForNewTickerMessage(tickerMessage: KucoinApiTickerMessage) {
  eventBus.emit(EventBusEvents.LAST_PRICE, tickerMessage)
}

export default class Runner {
  static runBots() {
    store.accounts.forEach((accountData: AccountData) => {
      new Account(accountData)
    })
  }

  static runPriceReader(filePaths?: string[], priceColumnIndex: number = 0) {
    if (store.isHistoricalPrice && filePaths && filePaths.length > 0) {
      PriceReader.startHistoricalStream(
        filePaths,
        priceColumnIndex,
        callbackForNewTickerMessage
      )
    } else {
      PriceReader.startAllSymbolsLivePriceStream(callbackForNewTickerMessage)
    }
  }
}
