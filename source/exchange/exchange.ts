import { randomUUID } from 'crypto'
import 'dotenv/config'
import kucoin from 'kucoin-node-api'
import {
  KucoinAccountConfig,
  KucoinErrorResponse,
  KucoinGetAllTickersResponse,
  KucoinGetFilledOrderByIdItem,
  KucoinGetFilledOrderByIdResponse,
  KucoinGetOrderByIdResponse,
  KucoinMarketOrderParameters,
  KucoinOrderPlacedResponse,
  KucoinSymbolData,
  KucoinSymbolsResponse,
  KucoinTicker,
} from '../types'
import { AccountEnvironmentType } from '../types/account-environment-type.js'
import ExchangeCodes from '../types/exchangeCodes.js'

export class Exchange {
  static publicConfig: KucoinAccountConfig = {
    apiKey: '',
    secretKey: '',
    passphrase: '',
    environment: AccountEnvironmentType.live,
  }

  static startWSTicker(
    symbol: string,
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

  static async getAllTickers(): Promise<KucoinTicker[] | undefined> {
    kucoin.init(Exchange.publicConfig)

    try {
      const response: KucoinGetAllTickersResponse = await kucoin.getAllTickers()

      if (response.code !== ExchangeCodes.responseSuccess) {
        return
      }

      return response.data.ticker
    } catch (e) {
      throw new Error(e)
    }
  }

  static async getTickersFromSymbols(
    symbols: string[]
  ): Promise<KucoinTicker[] | undefined> {
    const tickers: KucoinTicker[] | undefined = await Exchange.getAllTickers()

    if (!tickers) {
      return
    }

    const selectedTickers = tickers.filter((ticker: KucoinTicker) =>
      symbols.includes(ticker.symbol)
    )

    return selectedTickers
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

  static async tradeMarket(
    config: KucoinAccountConfig,
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
    config: KucoinAccountConfig,
    orderId: string
  ): Promise<KucoinGetOrderByIdResponse> {
    kucoin.init(config)

    return await kucoin.getOrderById({ id: orderId })
  }

  static getFilledOrderById(
    config: KucoinAccountConfig,
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
