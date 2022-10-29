import { randomUUID } from 'crypto'
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
import Messages from '../types/messages.js'

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
    const topic: string = 'ticker'
    kucoin.init(Exchange.publicConfig)

    kucoin.initSocket({ topic, symbols: [symbol] }, callback, () => {
      console.log(`${topic} websocket about to reopen...`)
      Exchange.startWSTicker(symbol, callback)
    })
  }

  static startWSAllSymbolsTicker(
    callback: (tickerMessageAsString: string) => void
  ) {
    const topic: string = 'allTicker'
    kucoin.init(Exchange.publicConfig)

    /* the provided callback runs once per each symbol message received */
    kucoin.initSocket({ topic }, callback, () => {
      console.log(`${topic} websocket about to reopen...`)
      Exchange.startWSAllSymbolsTicker(callback)
    })
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
  ): Promise<KucoinOrderPlacedResponse | KucoinErrorResponse | null> {
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

    let orderResponse: KucoinOrderPlacedResponse | KucoinErrorResponse | null =
      null

    try {
      orderResponse = await kucoin.placeOrder(parameters)
    } catch (error) {
      console.error(
        `\n${Messages.COULD_NOT_PLACE_ORDER_ON_EXCHANGE}:\n${error}\n`
      )
    }

    return orderResponse
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
        try {
          response = await kucoin.listFills({
            orderId,
          })
        } catch (error) {
          console.log(
            `\n${Messages.ATTEMPTING_TO_GET_ORDER_DETAILS_BY_ID}:\n${error}\n`
          )
        }

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
