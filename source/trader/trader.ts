import Big from 'big.js'
import { Exchange } from '../exchange/exchange.js'
import store from '../store/store.js'
import {
  AccountConfig,
  KucoinErrorResponse,
  KucoinGetFilledOrderByIdItem,
  KucoinOrderPlacedResponse,
} from '../types'
import ExchangeCodes from '../types/exchangeCodes.js'
import Messages from '../types/messages.js'
import { countDecimals, trimDecimalsToFixed } from '../utils/index.js'

export default class Trader {
  symbol: string
  tradeFee: string /* used in this file in fake trades only */
  accountConfig: AccountConfig
  baseIncrement: string /* used in this file in fake trades only */
  quoteIncrement: string /* used in this file in fake trades only */

  constructor(
    accountId: number,
    symbol: string,
    tradeFee: string,
    baseIncrement: string,
    quoteIncrement: string
  ) {
    this.symbol = symbol
    this.accountConfig = store.getAccountConfig(accountId)
    this.tradeFee = tradeFee
    this.baseIncrement = baseIncrement
    this.quoteIncrement = quoteIncrement
  }

  async trade(
    isBuy: boolean,
    amountToSpend: string
  ): Promise<string | undefined> {
    const response: KucoinOrderPlacedResponse | KucoinErrorResponse | null =
      await Exchange.tradeMarket(this.accountConfig, {
        symbol: this.symbol,
        amount: amountToSpend,
        isBuy,
      })

    if (
      !response ||
      response.code !== ExchangeCodes.responseSuccess ||
      !(response as KucoinOrderPlacedResponse).data.orderId
    ) {
      return
    }

    let filledOrderItem: KucoinGetFilledOrderByIdItem | null = null

    try {
      filledOrderItem = await Exchange.getFilledOrderById(
        this.accountConfig,
        (response as KucoinOrderPlacedResponse).data.orderId,
        5000,
        60000
      )
    } catch (error) {
      console.error(Messages.COULD_NOT_GET_ORDER_DETAILS_BY_ID)
    }

    if (!filledOrderItem) {
      return
    }

    if (isBuy) {
      const baseReceived: string = filledOrderItem.size

      // todo: remove console.log
      console.log('----------is buy---------')
      console.log('filledOrderItem.size', filledOrderItem.size)
      console.log('----------is buy---------')

      return baseReceived
    } else {
      const quoteReceived: string = filledOrderItem.funds
      console.log('----------is sell---------')
      console.log('filledOrderItem.funds', filledOrderItem.funds)
      console.log('----------is sell---------')

      return quoteReceived
    }
  }

  tradeFake(
    isBuy: boolean,
    amountToSpend: string,
    lastPrice: string
  ): string | undefined {
    if (isBuy) {
      const decimalsToRetain = countDecimals(this.baseIncrement)

      const baseReceived: string = this.deductTradeFeeFake(
        Big(amountToSpend).div(lastPrice)
      ).toFixed()

      const baseReceivedTrimmed = trimDecimalsToFixed(
        baseReceived,
        decimalsToRetain
      )

      if (typeof baseReceivedTrimmed !== 'string') {
        console.log(
          `${
            Messages.BASE_MUST_BE_STRING
          }: ${baseReceivedTrimmed} in ${__filename.slice(
            __dirname.length + 1
          )}`
        )

        return
      }

      return baseReceivedTrimmed
    } else {
      const decimalsToRetain = countDecimals(this.quoteIncrement)

      const quoteReceived: Big = this.deductTradeFeeFake(
        Big(amountToSpend).mul(lastPrice)
      )

      const quoteReceivedTrimmed = trimDecimalsToFixed(
        quoteReceived.toFixed(),
        decimalsToRetain
      )

      if (typeof quoteReceivedTrimmed !== 'string') {
        console.log(
          `${
            Messages.QUOTE_MUST_BE_STRING
          }: ${quoteReceivedTrimmed} in ${__filename.slice(
            __dirname.length + 1
          )}`
        )

        return
      }

      return quoteReceivedTrimmed
    }
  }

  deductTradeFeeFake(value: Big): Big {
    const amountDeducted = value.mul(this.tradeFee)

    return value.minus(amountDeducted)
  }
}
