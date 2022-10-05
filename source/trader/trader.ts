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
import { countDecimals, trimDecimalsToFixed } from '../utils/index.js'

export default class Trader {
  symbol: string
  tradeFee: number /* used across the project in fake trades only */
  accountConfig: AccountConfig
  baseIncrement: string /* used in this file in fake trades only */
  quoteIncrement: string /* used in this file in fake trades only */

  constructor(
    accountId: number,
    symbol: string,
    tradeFee: number,
    baseIncrement: string,
    quoteIncrement: string
  ) {
    this.symbol = symbol
    this.accountConfig = store.getAccountConfig(accountId)
    this.tradeFee = tradeFee
    this.baseIncrement = baseIncrement
    this.quoteIncrement = quoteIncrement
  }

  async trade(isBuy: boolean, amountToSpend: number): Promise<number | null> {
    const response: KucoinOrderPlacedResponse | KucoinErrorResponse =
      await Exchange.tradeMarket(this.accountConfig, {
        symbol: this.symbol,
        amount: amountToSpend,
        isBuy,
      })

    if (
      response.code === ExchangeCodes.responseSuccess &&
      (response as KucoinOrderPlacedResponse).data.orderId
    ) {
      const filledOrderItem: KucoinGetFilledOrderByIdItem | null =
        await Exchange.getFilledOrderById(
          this.accountConfig,
          (response as KucoinOrderPlacedResponse).data.orderId,
          5000,
          60000
        )

      if (!filledOrderItem) {
        return null
      }

      if (isBuy) {
        const baseReceived: number = parseFloat(filledOrderItem.size)

        return baseReceived
      } else {
        const quoteReceived: number = parseFloat(filledOrderItem.funds)

        return quoteReceived
      }
    } else {
      return null
    }
  }

  tradeFake(isBuy: boolean, amountToSpend: number, lastPrice: number): number {
    if (isBuy) {
      const decimalsToRetain = countDecimals(this.baseIncrement)

      const baseReceived: Big = this.deductTradeFeeFake(
        Big(amountToSpend).div(lastPrice)
      )

      return trimDecimalsToFixed(baseReceived.toNumber(), decimalsToRetain)
    } else {
      const decimalsToRetain = countDecimals(this.quoteIncrement)

      const quoteReceived: Big = this.deductTradeFeeFake(
        Big(amountToSpend).mul(lastPrice)
      )

      return trimDecimalsToFixed(quoteReceived.toNumber(), decimalsToRetain)
    }
  }

  deductTradeFeeFake(value: Big): Big {
    const amountDeducted = value.mul(this.tradeFee)

    return value.minus(amountDeducted)
  }
}
