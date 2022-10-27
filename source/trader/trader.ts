import Big from 'big.js'
import Currency from '../currency/currency'
import { Exchange } from '../exchange/exchange.js'
import store from '../store/store.js'
import {
  AccountConfig,
  BotConfigDynamic,
  BotConfigStatic,
  KucoinErrorResponse,
  KucoinGetFilledOrderByIdItem,
  KucoinOrderPlacedResponse,
} from '../types'
import ExchangeCodes from '../types/exchangeCodes.js'
import Messages from '../types/messages.js'

export default class Trader {
  symbol: string
  tradeFee: string /* used in this file in fake trades only */
  accountConfig: AccountConfig
  baseCurrency: Currency
  quoteCurrency: Currency

  constructor(configStatic: BotConfigStatic, configDynamic: BotConfigDynamic) {
    this.symbol = configStatic.symbol
    this.tradeFee = configDynamic.tradeFee
    this.accountConfig = store.getAccountConfig(configDynamic.itsAccountId)
    this.baseCurrency = new Currency(configDynamic.baseCurrency)
    this.quoteCurrency = new Currency(configDynamic.quoteCurrency)
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

    if (!response) {
      console.error(Messages.COULD_NOT_PLACE_ORDER_ON_EXCHANGE)
      return
    }

    if (response.code !== ExchangeCodes.responseSuccess) {
      console.log(response)
      return
    }

    if (!(response as KucoinOrderPlacedResponse).data.orderId) {
      console.log(Messages.ORDER_ID_MISSING_AFTER_ORDER_PLACED)
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
      const baseReceived: string = this.deductTradeFeeFake(
        Big(amountToSpend).div(lastPrice)
      ).toFixed()

      const baseReceivedNormalized: string | undefined =
        this.baseCurrency.normalize(baseReceived)

      if (typeof baseReceivedNormalized !== 'string') {
        console.log(
          `${
            Messages.BASE_MUST_BE_STRING
          }: ${baseReceivedNormalized} in ${__filename.slice(
            __dirname.length + 1
          )}`
        )

        return
      }

      return baseReceivedNormalized
    } else {
      const quoteReceived: Big = this.deductTradeFeeFake(
        Big(amountToSpend).mul(lastPrice)
      )

      const quoteReceivedNormalized =
        this.quoteCurrency.normalize(quoteReceived)

      if (typeof quoteReceivedNormalized !== 'string') {
        console.log(
          `${
            Messages.QUOTE_MUST_BE_STRING
          }: ${quoteReceivedNormalized} in ${__filename.slice(
            __dirname.length + 1
          )}`
        )

        return
      }

      return quoteReceivedNormalized
    }
  }

  deductTradeFeeFake(value: Big): Big {
    const amountDeducted = value.mul(this.tradeFee)

    return value.minus(amountDeducted)
  }
}
