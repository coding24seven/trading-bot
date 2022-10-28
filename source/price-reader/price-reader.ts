/*
 * gets last prices at real time
 * (kucoin ticker fires at 100ms interval)
 */

import Big from 'big.js'
import eventBus, { EventBusEvents } from '../events/event-bus.js'
import { Exchange } from '../exchange/exchange.js'
import CsvFileReader from '../file-reader/csv-file-reader.js'
import { DeepPartial, KucoinApiTickerMessage } from '../types'
import Messages from '../types/messages.js'

export default class PriceReader {
  static cachedFileContent: { [key: string]: number[][] } = {}
  static maxPossiblePrice: number = 2000000
  static dateMs: number = Date.now()
  static callbackIntervalDefaultMs: number = 1000
  static callbackIntervalMs: number = parseInt(
    process.env.LAST_PRICE_CALLBACK_INTERVAL_MS ||
      String(PriceReader.callbackIntervalDefaultMs)
  )

  static startOneSymbolLivePriceStream(
    symbol: string,
    callback: (lastPrice: string) => void
  ) {
    Exchange.startWSTicker(symbol, (tickerMessageAsString: string) => {
      const intervalNotCompleted: boolean =
        Date.now() < PriceReader.dateMs + PriceReader.callbackIntervalMs

      if (intervalNotCompleted) return

      PriceReader.dateMs = Date.now()

      const message: KucoinApiTickerMessage = JSON.parse(tickerMessageAsString)

      if (!message.data?.price) return

      const lastPrice: string = message.data.price

      if (PriceReader.priceIsValid(lastPrice)) {
        callback(lastPrice)
      }
    })
  }

  static startAllSymbolsLivePriceStream(
    callback: (tickerMessage: KucoinApiTickerMessage) => void
  ) {
    Exchange.startWSAllSymbolsTicker((tickerMessageAsString: string) => {
      /* this callback runs once per each symbol message received */
      const tickerMessage: KucoinApiTickerMessage = JSON.parse(
        tickerMessageAsString
      )

      if (!tickerMessage.data?.price) return

      const lastPrice: string = tickerMessage.data.price

      if (PriceReader.priceIsValid(lastPrice)) {
        callback(tickerMessage)
      }
    })
  }

  static startHistoricalStream(filePaths: string[], column: number) {
    filePaths.forEach((filePath: string) => {
      const rowsPopulatedWithNumbers: number[][] =
        this.cachedFileContent[filePath] ||
        CsvFileReader.getRowsPopulatedWithNumbers(filePath)

      this.cachedFileContent[filePath] = rowsPopulatedWithNumbers

      rowsPopulatedWithNumbers.forEach((row: number[]) => {
        const lastPrice: string = String(row[column])

        if (PriceReader.priceIsValid(lastPrice)) {
          const tickerMessage: DeepPartial<KucoinApiTickerMessage> = {
            data: { price: lastPrice },
          }

          eventBus.emit(EventBusEvents.LAST_PRICE, tickerMessage)
        }
      })
    })

    eventBus.emit(EventBusEvents.HISTORICAL_PRICE_READER_FINISHED)
  }

  private static priceIsValid(price: string): boolean {
    if (isNaN(parseFloat(price))) {
      console.log(`${price} ${Messages.IS_NOT_A_NUMBER}`)
      return false
    }

    const priceOutsideBounds: boolean =
      Big(price).lte(0) || Big(price).gt(PriceReader.maxPossiblePrice)

    return !priceOutsideBounds
  }
}
