import Big from 'big.js'
import Currency from '../currency/currency.js'
import eventBus, { EventBusEvents } from '../events/event-bus.js'
import store from '../store/store.js'
import Trader from '../trader/trader.js'
import {
  BotData,
  BotHand,
  BotResults,
  BuyOrSell,
  KucoinApiTickerMessage,
  TradeHistoryItem,
} from '../types'
import Messages from '../types/messages.js'
import {
  calculatePercentIncreaseOrDecrease,
  getTime,
  safeJsonParse,
} from '../utils/index.js'

export default class Bot {
  data: BotData
  id: number
  itsAccountId: number
  hands: BotHand[] = []
  quoteCurrency: Currency
  baseCurrency: Currency
  trader: Trader
  symbol: string // i.e. 'BTC-USDT'
  lastPrice: string | null = null
  lowestPriceRecorded: string
  highestPriceRecorded: string
  count: number = 0
  tradeHistory: TradeHistoryItem[] = [] // not added to store atm
  dateMs: number = Date.now()
  processLastPriceIntervalDefaultMs: number = 1000
  processLastPriceIntervalMs: number = parseInt(
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

  checkData() {
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

  onHistoricalPriceReaderFinished() {
    store.setResults(this.itsAccountId, this.id, this.getResults())

    eventBus.emit(
      EventBusEvents.BOT_DONE_PROCESSING_HISTORICAL_PRICES,
      this.getHistoricalBotDataWithResults()
    )
  }

  async onLastPrice(tickerMessage: KucoinApiTickerMessage) {
    const symbol: string = tickerMessage.subject
    const lastPrice: string = tickerMessage.data.price

    if (!store.isHistoricalPrice) {
      const intervalNotCompleted: boolean =
        Date.now() < this.dateMs + this.processLastPriceIntervalMs

      if (intervalNotCompleted || this.symbol !== symbol) return

      console.log(getTime(), symbol, lastPrice)
      this.dateMs = Date.now()
    }

    this.lastPrice = lastPrice

    const newLowestOrHighestPriceRecorded: boolean =
      this.recordLowestAndHighestPrice(lastPrice)

    if (!store.isHistoricalPrice && newLowestOrHighestPriceRecorded) {
      this.storeCurrentResults()
    }

    this.processLastPrice(lastPrice)
  }

  processLastPrice(lastPrice: string) {
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

      let baseReceived: string | undefined

      if (store.isHistoricalPrice) {
        baseReceived = this.trader.tradeFake(true, quoteToSpend, lastPrice)
      } else {
        hand.tradeIsPending = true
        baseReceived = await this.trader.trade(true, quoteToSpend)
      }

      if (!baseReceived) {
        hand.tradeIsPending = false
        return
      }

      hand.quote = Big(hand.quote).minus(quoteToSpend).toFixed()
      hand.base = Big(hand.base).plus(baseReceived).toFixed()
      hand.buyCount++
      hand.tradeIsPending = false
      this.updateAfterTrade(hand, lastPrice, quoteToSpend, baseReceived, 'buy')
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

      let quoteReceived: string | undefined

      if (store.isHistoricalPrice) {
        quoteReceived = this.trader.tradeFake(false, baseToSpend, lastPrice)
      } else {
        hand.tradeIsPending = true
        quoteReceived = await this.trader.trade(false, baseToSpend)
      }

      if (!quoteReceived) {
        hand.tradeIsPending = false
        return
      }

      hand.base = Big(hand.base).minus(baseToSpend).toFixed()
      hand.quote = Big(hand.quote).plus(quoteReceived).toFixed()
      hand.sellCount++
      hand.tradeIsPending = false
      this.updateAfterTrade(hand, lastPrice, baseToSpend, quoteReceived, 'sell')
    })
  }

  isBaseCurrencyEnoughToTrade(base: string, lastPrice: string): boolean {
    const baseInQuote: Big = Big(base).mul(lastPrice)

    return (
      Big(base).gte(this.data.configDynamic.baseCurrency.minSize) &&
      Big(baseInQuote).gte(this.data.configDynamic.minFunds)
    )
  }

  isQuoteCurrencyEnoughToTrade(quote: string): boolean {
    return (
      Big(quote).gte(this.data.configDynamic.quoteCurrency.minSize) &&
      Big(quote).gte(this.data.configDynamic.minFunds)
    )
  }

  getHistoricalBotDataWithResults(options?: {
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

  getResults(): BotResults | undefined {
    if (!this.lastPrice) {
      return
    }

    const baseTotal: string = this.hands
      .reduce(
        (accumulator: Big, { base }: BotHand) => Big(accumulator).plus(base),
        Big('0')
      )
      .toFixed()

    const quoteTotal: string = this.hands
      .reduce(
        (accumulator: Big, { quote }: BotHand) => Big(accumulator).plus(quote),
        Big('0')
      )
      .toFixed()

    const baseConvertedToQuoteAtLastPrice: string | undefined =
      this.trader.tradeFake(false, baseTotal, this.lastPrice)

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

    const pairTotalAsQuoteWhenAllSold: string =
      this.getPairTotalAsQuoteWhenAllSold()

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

  getPairTotalAsQuoteWhenAllSold(): string {
    const botHands: BotHand[] = safeJsonParse(JSON.stringify(this.hands))

    botHands.forEach((hand: BotHand) => {
      if (Big(hand.base).gt(0)) {
        const quoteReceived: string | undefined = this.trader.tradeFake(
          false,
          hand.base,
          hand.sellAbove
        )

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

  getTradeHistoryItem(
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

  makeBaseValidForTrade(base: string): string | undefined {
    const baseValidForTrade: string | undefined =
      this.baseCurrency.normalize(base)

    if (typeof baseValidForTrade !== 'string') {
      console.log(`${Messages.BASE_MUST_BE_STRING}: ${baseValidForTrade}`)

      return
    }

    return baseValidForTrade
  }

  makeQuoteValidForTrade(quote: string): string | undefined {
    const quoteValidForTrade: string | undefined =
      this.quoteCurrency.normalize(quote)

    if (typeof quoteValidForTrade !== 'string') {
      console.log(`${Messages.QUOTE_MUST_BE_STRING}: ${quoteValidForTrade}`)

      return
    }

    return quoteValidForTrade
  }

  updateAfterTrade(
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

    if (store.isHistoricalPrice) return

    console.log(tradeHistoryItem)

    this.storeCurrentResults()
  }

  storeCurrentResults() {
    store.setResults(this.itsAccountId, this.id, this.getResults())
  }

  recordLowestAndHighestPrice(lastPrice: string): boolean {
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
