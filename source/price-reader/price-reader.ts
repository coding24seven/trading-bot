/* get prices from historical-price files
 * OR
 * get last prices in real time
 * (kucoin ticker fires at 100ms interval)
 */

import Big from 'big.js'
import eventBus, { EventBusEvents } from '../events/event-bus.js'
import { Exchange } from '../exchange/exchange.js'
import CsvFileReader from '../file-reader/csv-file-reader.js'
import { DeepPartial, KucoinApiTickerMessage } from '../types'
import Messages from '../types/messages.js'
import { safeJsonParse } from '../utils/index.js'

export default class PriceReader {
  private static cachedFileContent: { [key: string]: number[][] } = {}
  private static maxPossiblePrice: number = 2000000
  private static dateMs: number = Date.now()
  private static callbackIntervalDefaultMs: number = 1000
  private static callbackIntervalMs: number = parseInt(
    process.env.LAST_PRICE_CALLBACK_INTERVAL_MS ||
    String(PriceReader.callbackIntervalDefaultMs)
  )

  public static startOneSymbolLivePriceStream(
    symbol: string,
    callback: (lastPrice: string) => void
  ) {
    Exchange.startWSTicker(symbol, (tickerMessageAsString: string) => {
      const intervalNotCompleted: boolean =
        Date.now() < PriceReader.dateMs + PriceReader.callbackIntervalMs

      if (intervalNotCompleted) return

      PriceReader.dateMs = Date.now()

      const message: KucoinApiTickerMessage = safeJsonParse(
        tickerMessageAsString
      )

      if (!message.data?.price) return

      const lastPrice: string = message.data.price

      if (PriceReader.priceIsValid(lastPrice)) {
        callback(lastPrice)
      }
    })
  }

  public static startAllSymbolsLivePriceStream(
    callback: (tickerMessage: KucoinApiTickerMessage) => void
  ) {
    Exchange.startWSAllSymbolsTicker((tickerMessageAsString: string) => {
      /* this callback runs once per each symbol message received */
      const tickerMessage: KucoinApiTickerMessage = safeJsonParse(
        tickerMessageAsString
      )

      if (!tickerMessage.data?.price) return

      const lastPrice: string = tickerMessage.data.price

      if (PriceReader.priceIsValid(lastPrice)) {
        callback(tickerMessage)
      }
    })
  }

  public static startHistoricalStream(
    filePaths: string[],
    column: number,
    callback: (tickerMessage: DeepPartial<KucoinApiTickerMessage>) => void
  ) {
    filePaths.forEach((filePath: string) => {
      console.log(`${Messages.BOT_CONFIGURATION_BEING_TESTED}: ${filePath}`)

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

          callback(tickerMessage)
        }
      })
    })

    eventBus.emit(EventBusEvents.HISTORICAL_PRICE_READER_FINISHED)
  }

  private static priceIsValid(price: string): boolean {
    if (isNaN(parseFloat(price))) {
      console.error(`${price} ${Messages.IS_NOT_A_NUMBER}`)

      return false
    }

    const priceOutsideBounds: boolean =
      Big(price).lte(0) || Big(price).gt(PriceReader.maxPossiblePrice)

    return !priceOutsideBounds
  }
}
