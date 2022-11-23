import Big from 'big.js'
import Currency from '../currency/currency.js'
import { Exchange } from '../exchange/exchange.js'
import store from '../store/store.js'
import {
  AccountConfig,
  BotConfigDynamic,
  BotConfigStatic,
  BuyOrderTally,
  KucoinErrorResponse, KucoinGetOrderByIdData, KucoinOrderPlacedResponse, SellOrderTally
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
  ): Promise<BuyOrderTally | SellOrderTally | undefined> {
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

    let filledOrderItem: KucoinGetOrderByIdData | null = null

    try {
      filledOrderItem = await Exchange.getFilledOrderById(
        this.accountConfig,
        (response as KucoinOrderPlacedResponse).data.orderId,
        5000,
        60000
      )

      if (!filledOrderItem) {
        return
      }

      const { dealSize, dealFunds, fee } = filledOrderItem

      if (isBuy) {
        const orderTally: BuyOrderTally = {
          quoteSpent: Big(dealFunds).plus(fee),
          baseReceived: Big(dealSize)
        }

        return orderTally
      } else {
        const buyOrderTally: SellOrderTally = {
          baseSpent: Big(dealSize),
          quoteReceived: Big(dealFunds).minus(fee),
        }

        return buyOrderTally
      }
    } catch (error) {
      console.error(Messages.COULD_NOT_GET_ORDER_DETAILS_BY_ID)
    }
  }

  tradeFake(
    isBuy: boolean,
    amountToSpend: string,
    lastPrice: string
  ): BuyOrderTally | SellOrderTally | undefined {
    if (isBuy) {
      const baseReceived: string = this.deductTradeFeeFake(
        Big(amountToSpend).div(lastPrice)
      ).toFixed()

      const baseReceivedNormalized: string | undefined =
        this.baseCurrency.normalize(baseReceived)

      if (typeof baseReceivedNormalized !== 'string') {
        console.log(
          `${Messages.BASE_MUST_BE_STRING
          }: ${baseReceivedNormalized} in ${__filename.slice(
            __dirname.length + 1
          )}`
        )

        return
      }

      const buyOrderTally: BuyOrderTally = {
        quoteSpent: Big(amountToSpend),
        baseReceived: Big(baseReceivedNormalized)
      }

      return buyOrderTally
    } else {
      const quoteReceived: Big = this.deductTradeFeeFake(
        Big(amountToSpend).mul(lastPrice)
      )

      const quoteReceivedNormalized =
        this.quoteCurrency.normalize(quoteReceived)

      if (typeof quoteReceivedNormalized !== 'string') {
        console.log(
          `${Messages.QUOTE_MUST_BE_STRING
          }: ${quoteReceivedNormalized} in ${__filename.slice(
            __dirname.length + 1
          )}`
        )

        return
      }

      const sellOrderTally: SellOrderTally = {
        baseSpent: Big(amountToSpend),
        quoteReceived: Big(quoteReceivedNormalized)
      }

      return sellOrderTally
    }
  }

  deductTradeFeeFake(value: Big): Big {
    const amountDeducted = value.mul(this.tradeFee)

    return value.minus(amountDeducted)
  }
}
