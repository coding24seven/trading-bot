import { AxiosResponse } from 'axios'
import Big from 'big.js'
import Currency from '../currency/currency.js'
import eventBus, { EventBusEvents } from '../events/event-bus.js'
import store from '../store/store.js'
import Trader from '../trader/trader.js'
import {
  BotConfigDynamic,
  BotConfigStatic,
  BotData,
  BotHand,
  BotResults,
  BuyOrderTally,
  BuyOrSell,
  KucoinApiTickerMessage,
  SellOrderTally,
  TradeHistoryItem
} from '../types'
import Messages from '../types/messages.js'
import {
  calculatePercentIncreaseOrDecrease,
  getDateTime,
  getTime,
  safeJsonParse
} from '../utils/index.js'

export default class Bot {
  private readonly data: BotData
  private readonly id: number
  private readonly itsAccountId: number
  private readonly hands: readonly BotHand[] = []
  private readonly quoteCurrency: Currency
  private readonly baseCurrency: Currency
  private readonly trader: Trader
  private readonly symbol: string // i.e. 'BTC-USDT'
  private lastPrice: string | null = null
  private lowestPriceRecorded: string
  private highestPriceRecorded: string
  private readonly tradeHistory: TradeHistoryItem[] = [] // not added to store atm
  private dateMs: number = Date.now()
  private readonly processLastPriceIntervalDefaultMs: number = 1000
  private readonly processLastPriceIntervalMs: number = parseInt(
    process.env.LAST_PRICE_CALLBACK_INTERVAL_MS ||
    String(this.processLastPriceIntervalDefaultMs)
  )

  constructor(data: BotData) {
    this.data = data
    this.id = data.configDynamic.id
    this.itsAccountId = data.configDynamic.itsAccountId
    this.hands = data.hands
    this.symbol = data.configStatic.symbol
    this.baseCurrency = new Currency(data.configDynamic.baseCurrency)
    this.quoteCurrency = new Currency(data.configDynamic.quoteCurrency)
    this.lowestPriceRecorded =
      data.results?.lowestPriceRecorded || '99999999999999999999'
    this.highestPriceRecorded = data.results?.highestPriceRecorded || '0'
    this.trader = new Trader(data.configStatic, data.configDynamic)
    this.checkData()

    eventBus.on(EventBusEvents.LAST_PRICE, this.onLastPrice.bind(this))
    eventBus.on(
      EventBusEvents.HISTORICAL_PRICE_READER_FINISHED,
      this.onHistoricalPriceReaderFinished.bind(this)
    )
  }

  private checkData() {
    if (
      !this.data.configDynamic.baseCurrency.minSize ||
      !this.data.configDynamic.quoteCurrency.minSize ||
      !this.data.configDynamic.minFunds
    ) {
      throw new Error(Messages.MINIMUM_ALLOWED_TRADE_SIZES_NOT_SET)
    }

    if (!this.baseCurrency.increment || !this.quoteCurrency.increment) {
      throw new Error(Messages.TRADE_SIZE_INCREMENT_NOT_SET)
    }
  }

  private onHistoricalPriceReaderFinished() {
    this.setResults()

    eventBus.emit(
      EventBusEvents.BOT_DONE_PROCESSING_HISTORICAL_PRICES,
      this.getHistoricalBotDataWithResults()
    )
  }

  private async onLastPrice(tickerMessage: KucoinApiTickerMessage) {
    const symbol: string = tickerMessage.subject
    const lastPrice: string = tickerMessage.data.price

    if (!store.isHistoricalPrice) {
      const intervalCompleted: boolean =
        Date.now() > this.dateMs + this.processLastPriceIntervalMs

      if (!intervalCompleted || this.symbol !== symbol) {
        return
      }

      console.log(getTime(), symbol, lastPrice)
      this.dateMs = Date.now()

      if (!this.isTriggered(lastPrice)) {
        return
      }
    }

    this.lastPrice = lastPrice

    const newLowestOrHighestPriceRecorded: boolean =
      this.recordLowestAndHighestPrice(lastPrice)

    if (!store.isHistoricalPrice && newLowestOrHighestPriceRecorded) {
      this.setResults()
    }

    this.processLastPrice(lastPrice)
  }

  private processLastPrice(lastPrice: string) {
    const buyingHands: BotHand[] = this.hands.filter(
      (hand: BotHand) =>
        !hand.tradeIsPending &&
        this.isQuoteCurrencyEnoughToTrade(hand.quote) &&
        Big(lastPrice).lt(hand.buyBelow)
    )

    buyingHands.forEach(async (hand: BotHand) => {
      const quoteToSpend: string | undefined = this.makeQuoteValidForTrade(
        hand.quote
      )

      if (!quoteToSpend) {
        return
      }

      let buyOrderTally: BuyOrderTally | undefined

      if (store.isHistoricalPrice) {
        buyOrderTally = this.trader.tradeFake(true, quoteToSpend, lastPrice)
      } else {
        hand.tradeIsPending = true
        buyOrderTally = await this.trader.trade(true, quoteToSpend)
      }

      if (!buyOrderTally) {
        hand.tradeIsPending = false
        return
      }

      const { quoteSpent, baseReceived }: BuyOrderTally = buyOrderTally

      hand.quote = Big(hand.quote).minus(quoteSpent).toFixed()
      hand.base = Big(hand.base).plus(baseReceived).toFixed()
      hand.buyCount++
      hand.tradeIsPending = false
      this.updateAfterTrade(hand, lastPrice, quoteSpent.toFixed(), baseReceived.toFixed(), 'buy')
    })

    const sellingHands: BotHand[] = this.hands.filter(
      (hand: BotHand) =>
        !hand.tradeIsPending &&
        this.isBaseCurrencyEnoughToTrade(hand.base, lastPrice) &&
        Big(lastPrice).gt(hand.sellAbove)
    )

    sellingHands.forEach(async (hand: BotHand) => {
      const baseToSpend: string | undefined = this.makeBaseValidForTrade(
        hand.base
      )

      if (!baseToSpend) {
        return
      }

      let sellOrderTally: SellOrderTally | undefined

      if (store.isHistoricalPrice) {
        sellOrderTally = this.trader.tradeFake(false, baseToSpend, lastPrice)
      } else {
        hand.tradeIsPending = true
        sellOrderTally = await this.trader.trade(false, baseToSpend)
      }

      if (!sellOrderTally) {
        hand.tradeIsPending = false
        return
      }

      const { baseSpent, quoteReceived }: SellOrderTally = sellOrderTally

      hand.base = Big(hand.base).minus(baseSpent).toFixed()
      hand.quote = Big(hand.quote).plus(quoteReceived).toFixed()
      hand.sellCount++
      hand.tradeIsPending = false
      this.updateAfterTrade(hand, lastPrice, baseSpent.toFixed(), quoteReceived.toFixed(), 'sell')
    })
  }

  private isBaseCurrencyEnoughToTrade(base: string, lastPrice: string): boolean {
    const baseInQuote: Big = Big(base).mul(lastPrice)

    return (
      Big(base).gte(this.data.configDynamic.baseCurrency.minSize) &&
      Big(baseInQuote).gte(this.data.configDynamic.minFunds)
    )
  }

  private isQuoteCurrencyEnoughToTrade(quote: string): boolean {
    return (
      Big(quote).gte(this.data.configDynamic.quoteCurrency.minSize) &&
      Big(quote).gte(this.data.configDynamic.minFunds)
    )
  }

  private isTriggered(lastPrice: string): boolean {
    const { triggered }: BotConfigDynamic = this.data.configDynamic

    if (triggered) {
      return true
    }

    const { triggerBelowPrice }: BotConfigStatic = this.data.configStatic

    if (!triggerBelowPrice) {
      return this.setTriggered()
    }

    if (!triggered) {
      if (Big(lastPrice).lt(triggerBelowPrice)) {
        return this.setTriggered()
      } else {
        console.log(
          `${Messages.BOT_WILL_BE_TRIGGERED_WHEN_PRICE} ${triggerBelowPrice}`
        )
      }
    }

    return false
  }

  private setTriggered(): boolean {
    this.data.configDynamic.triggered = true

    return true
  }

  private getHistoricalBotDataWithResults(options?: {
    tradeHistoryIncluded: boolean
  }): BotData {
    return {
      hands: this.hands,
      ...(options?.tradeHistoryIncluded && { tradeHistory: this.tradeHistory }),
      configStatic: this.data.configStatic,
      configDynamic: this.data.configDynamic,
      results: store.getResults(this.itsAccountId, this.id),
    }
  }

  private getResults(): BotResults | undefined {
    if (!this.lastPrice) {
      return
    }

    const baseTotal: string = this.hands
      .reduce(
        (accumulator: Big, { base }: BotHand) => Big(accumulator).plus(base),
        Big('0')
      )
      .toFixed()

    const quoteTotal: string | undefined = this.quoteCurrency.normalize(this.hands
      .reduce(
        (accumulator: Big, { quote }: BotHand) => Big(accumulator).plus(quote),
        Big('0')
      ))

    if (typeof quoteTotal !== 'string') {
      console.error(
        `${quoteTotal} ${Messages.IS_NOT_STRING}`
      )
      return
    }

    const sellOrderTally: SellOrderTally = this.trader.tradeFake(false, baseTotal, this.lastPrice) as SellOrderTally
    const baseConvertedToQuoteAtLastPrice: string = sellOrderTally.quoteReceived.toFixed()

    if (typeof baseConvertedToQuoteAtLastPrice !== 'string') {
      console.error(
        `${baseConvertedToQuoteAtLastPrice} ${Messages.IS_NOT_STRING}`
      )
      return
    }

    const pairTotalAsQuoteAtLastPrice: string | undefined =
      this.quoteCurrency.normalize(
        Big(quoteTotal).plus(baseConvertedToQuoteAtLastPrice)
      )

    if (typeof pairTotalAsQuoteAtLastPrice !== 'string') {
      console.error(`${pairTotalAsQuoteAtLastPrice} ${Messages.IS_NOT_STRING}`)
      return
    }

    const profitPercentAtLastPrice: string = calculatePercentIncreaseOrDecrease(
      this.data.configStatic.quoteStartAmount,
      pairTotalAsQuoteAtLastPrice
    )

    const pairTotalAsQuoteWhenAllSold: string | undefined =
      this.quoteCurrency.normalize(this.getPairTotalAsQuoteWhenAllSold())

    if (typeof pairTotalAsQuoteWhenAllSold !== 'string') {
      console.error(`${pairTotalAsQuoteWhenAllSold} ${Messages.IS_NOT_STRING}`)
      return
    }

    const profitPercentWhenAllSold: string = calculatePercentIncreaseOrDecrease(
      this.data.configStatic.quoteStartAmount,
      pairTotalAsQuoteWhenAllSold
    )

    const buyCountTotal: number = this.hands
      .reduce(
        (accumulator: Big, { buyCount }: BotHand) =>
          Big(accumulator).plus(buyCount),
        Big(0)
      )
      .toNumber()

    const sellCountTotal: number = this.hands
      .reduce(
        (accumulator: Big, { sellCount }: BotHand) =>
          Big(accumulator).plus(sellCount),
        Big(0)
      )
      .toNumber()

    return {
      quoteTotal,
      baseConvertedToQuoteAtLastPrice,
      pairTotalAsQuoteAtLastPrice,
      profitPercentAtLastPrice,
      pairTotalAsQuoteWhenAllSold,
      profitPercentWhenAllSold,
      baseTotal,
      buyCountTotal,
      sellCountTotal,
      lowestPriceRecorded: this.lowestPriceRecorded,
      highestPriceRecorded: this.highestPriceRecorded,
      lastPrice: this.lastPrice,
    }
  }

  private getPairTotalAsQuoteWhenAllSold(): string {
    const botHands: BotHand[] = safeJsonParse(JSON.stringify(this.hands))

    botHands.forEach((hand: BotHand) => {
      if (Big(hand.base).gt(0)) {
        const sellOrderTally: SellOrderTally = this.trader.tradeFake(
          false,
          hand.base,
          hand.sellAbove
        ) as SellOrderTally
        const quoteReceived: string = sellOrderTally.quoteReceived.toFixed()

        if (quoteReceived) {
          const quoteTogether: string | undefined =
            this.quoteCurrency.normalize(Big(hand.quote).plus(quoteReceived))

          if (quoteTogether) {
            hand.quote = quoteTogether
          }
        }

        hand.base = '0'
      }
    })

    return botHands
      .reduce(
        (accumulator: Big, item: BotHand) => Big(accumulator).plus(item.quote),
        Big('0')
      )
      .toFixed()
  }

  private getTradeHistoryItem(
    hand: BotHand,
    lastPrice: string,
    amountSpent: string,
    amountReceived: string,
    type: BuyOrSell
  ): TradeHistoryItem {
    return {
      ...hand,
      ...(type === 'buy' && { quoteSpent: amountSpent }),
      ...(type === 'buy' && { baseReceived: amountReceived }),
      ...(type === 'sell' && { baseSpent: amountSpent }),
      ...(type === 'sell' && { quoteReceived: amountReceived }),
      lastPrice,
      type,
    }
  }

  private makeBaseValidForTrade(base: string): string | undefined {
    const baseValidForTrade: string | undefined =
      this.baseCurrency.normalize(base)

    if (typeof baseValidForTrade !== 'string') {
      console.error(`${Messages.BASE_MUST_BE_STRING}: ${baseValidForTrade}`)

      return
    }

    return baseValidForTrade
  }

  private makeQuoteValidForTrade(quote: string): string | undefined {
    const quoteValidForTrade: string | undefined =
      this.quoteCurrency.normalize(quote)

    if (typeof quoteValidForTrade !== 'string') {
      console.error(`${Messages.QUOTE_MUST_BE_STRING}: ${quoteValidForTrade}`)

      return
    }

    return quoteValidForTrade
  }

  private updateAfterTrade(
    hand: BotHand,
    lastPrice: string,
    amountSpent: string,
    amountReceived: string,
    type: BuyOrSell
  ) {
    const tradeHistoryItem: TradeHistoryItem = this.getTradeHistoryItem(
      hand,
      lastPrice,
      amountSpent,
      amountReceived,
      type
    )
    this.tradeHistory.push(tradeHistoryItem)

    if (store.isHistoricalPrice) {
      return
    }

    console.log(tradeHistoryItem)

    this.setResults()
  }

  private async setResults() {
    this.data.results = this.getResults()

    if (!this.data.results || store.isHistoricalPrice) {
      return
    }

    this.data.lastModified = getDateTime(
      store.appEnvironment.locale,
      store.appEnvironment.timeZone
    )

    const writeResponse: AxiosResponse | string = await store.writeDatabase()

    if (typeof writeResponse === 'string') {
      console.error(writeResponse)
    } else if (writeResponse.status !== 200) {
      console.error(writeResponse.data)
    }
  }

  private recordLowestAndHighestPrice(lastPrice: string): boolean {
    if (Big(lastPrice).lt(this.lowestPriceRecorded)) {
      this.lowestPriceRecorded = lastPrice
      return true
    }

    if (Big(lastPrice).gt(this.highestPriceRecorded)) {
      this.highestPriceRecorded = lastPrice
      return true
    }

    return false
  }
}
