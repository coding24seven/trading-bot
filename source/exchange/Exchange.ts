import 'dotenv/config'
import { randomUUID } from 'crypto'
import kucoin from 'kucoin-node-api'
import {
  AccountConfig,
  KucoinErrorResponse,
  KucoinGetFilledOrderByIdItem,
  KucoinGetFilledOrderByIdResponse,
  KucoinGetOrderByIdResponse,
  KucoinMarketOrderParameters,
  KucoinOrderPlacedResponse,
  KucoinSymbolData,
  KucoinSymbolsResponse,
  PairTradeSizes,
} from '../types'
import ExchangeCodes from '../types/exchangeCodes.js'

export class Exchange {
  static market: string = process.env.MARKET!
  static defaultSymbol: string = process.env.SYMBOL_GLOBAL!
  static publicConfig: AccountConfig = {
    apiKey: '',
    secretKey: '',
    passphrase: '',
    environment: 'live',
  }

  static startWSTicker(
    symbol: string = Exchange.defaultSymbol,
    callback: (tickerMessageAsString: string) => void
  ) {
    kucoin.init(Exchange.publicConfig)
    kucoin.initSocket({ topic: 'ticker', symbols: [symbol] }, callback)
  }

  static startWSAllSymbolsTicker(
    callback: (tickerMessageAsString: string) => void
  ) {
    kucoin.init(Exchange.publicConfig)

    /* the provided callback runs once per each symbol message received */
    kucoin.initSocket({ topic: 'allTicker' }, callback)
  }

  static async getAllSymbolsData(): Promise<KucoinSymbolData[] | undefined> {
    kucoin.init(Exchange.publicConfig)

    try {
      const response: KucoinSymbolsResponse = await kucoin.getSymbols()

      if (response.code !== ExchangeCodes.responseSuccess) {
        return
      }

      return response.data
    } catch (e) {
      throw new Error(e)
    }
  }

  static async getSymbolData(
    symbol: string = Exchange.defaultSymbol
  ): Promise<KucoinSymbolData | undefined> {
    kucoin.init(Exchange.publicConfig)

    try {
      const response: KucoinSymbolsResponse = await kucoin.getSymbols(
        Exchange.market
      )

      if (response.code !== ExchangeCodes.responseSuccess) {
        return
      }

      return response.data.find(
        (item: KucoinSymbolData) => item.symbol === symbol
      )
    } catch (e) {
      throw new Error(e)
    }
  }

  static async getMinimumTradeSizes(
    symbol: string = Exchange.defaultSymbol
  ): Promise<PairTradeSizes | null> {
    const symbolData: KucoinSymbolData | undefined =
      await Exchange.getSymbolData(symbol)

    const base: string | undefined = symbolData?.baseMinSize
    const quote: string | undefined = symbolData?.quoteMinSize

    if (!base || !quote) {
      return null
    }

    return {
      base: parseFloat(base),
      quote: parseFloat(quote),
    }
  }

  static async tradeMarket(
    config: AccountConfig,
    { symbol, amount, isBuy }
  ): Promise<KucoinOrderPlacedResponse | KucoinErrorResponse> {
    const side: string = isBuy ? 'buy' : 'sell'
    const baseOrQuote: string = isBuy ? 'funds' : 'size'

    const parameters: KucoinMarketOrderParameters = {
      clientOid: randomUUID(),
      type: 'market',
      side,
      symbol,
      [baseOrQuote]: amount,
    }

    kucoin.init(config)

    return await kucoin.placeOrder(parameters)
  }

  static async getOrderById(
    config: AccountConfig,
    orderId: string
  ): Promise<KucoinGetOrderByIdResponse> {
    kucoin.init(config)

    return await kucoin.getOrderById({ id: orderId })
  }

  static getFilledOrderById(
    config: AccountConfig,
    orderId: string,
    requestIntervalMs: number,
    timeoutMs: number
  ): Promise<KucoinGetFilledOrderByIdItem | null> {
    kucoin.init(config)
    let response: KucoinGetFilledOrderByIdResponse

    return new Promise((resolve, reject) => {
      let timeout: NodeJS.Timeout
      const interval: NodeJS.Timer = setInterval(async () => {
        response = await kucoin.listFills({
          orderId,
        })

        const expectedItemQuantity: number = 1

        if (
          response.code === ExchangeCodes.responseSuccess &&
          response.data.items.length === expectedItemQuantity
        ) {
          clearInterval(interval)
          clearTimeout(timeout)
          const indexOfQueriedOrder: number = 0
          resolve(response.data.items[indexOfQueriedOrder])
        }
      }, requestIntervalMs)

      timeout = setTimeout(() => {
        clearInterval(interval)
        reject(null)
      }, timeoutMs)
    })
  }
}
